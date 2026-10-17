-- ============================================================================
-- PIXELFORGE — Creative Asset Studio
-- Migration: 20261016000001_initial_schema.sql
-- Description: Core PostgreSQL schema for all 16 domain tables, constraints,
--              indexes, updated_at triggers, and profile initialization flow.
-- ============================================================================

-- Ensure auth schema and auth.users / auth.uid() exist in non-Supabase test environments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  raw_user_meta_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), current_user);
$$;

-- ============================================================================
-- 0. Utility Trigger Function: set_updated_at()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 1. profiles
-- ============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'client')),
  avatar_path TEXT NULL,
  bio TEXT NULL,
  website_url TEXT NULL,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9][a-z0-9_-]{2,38}$'),
  CONSTRAINT profiles_social_links_object CHECK (jsonb_typeof(social_links) = 'object')
);

CREATE INDEX idx_profiles_username ON public.profiles(username);

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Automatic profile initialization after auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  user_role TEXT;
BEGIN
  base_username := lower(regexp_replace(
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(COALESCE(NEW.email, 'user'), '@', 1)
    ),
    '[^a-z0-9_-]',
    '-',
    'g'
  ));

  IF length(base_username) < 3 THEN
    base_username := 'studio-' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;

  final_username := substr(base_username, 1, 28) || '-' || substr(replace(NEW.id::text, '-', ''), 1, 6);

  user_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' = 'client' THEN 'client'
    ELSE 'owner'
  END;

  INSERT INTO public.profiles (id, display_name, username, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''), split_part(COALESCE(NEW.email, 'Creator'), '@', 1)),
    final_username,
    user_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. clients
-- ============================================================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  email TEXT NULL,
  company TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_clients_owner_id ON public.clients(owner_id);

CREATE TRIGGER trg_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. assets
-- ============================================================================
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  description TEXT NULL,
  original_filename TEXT NOT NULL CHECK (char_length(trim(original_filename)) > 0),
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 52428800),
  width INTEGER NULL CHECK (width IS NULL OR (width > 0 AND width <= 32768)),
  height INTEGER NULL CHECK (height IS NULL OR (height > 0 AND height <= 32768)),
  category TEXT NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_assets_owner_id ON public.assets(owner_id);
CREATE INDEX idx_assets_visibility ON public.assets(visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_created_at ON public.assets(created_at DESC);

CREATE TRIGGER trg_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. projects
-- ============================================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NULL REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description TEXT NULL,
  brief TEXT NULL,
  category TEXT NULL,
  cover_asset_id UUID NULL REFERENCES public.assets(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'in_review', 'completed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE NULL,
  due_date DATE NULL,
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  archived_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_projects_owner_slug UNIQUE (owner_id, slug),
  CONSTRAINT chk_projects_dates CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date)
);

CREATE INDEX idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_visibility ON public.projects(visibility);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ensure client_id belongs to the same owner_id as the project
CREATE OR REPLACE FUNCTION public.validate_project_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = NEW.client_id AND c.owner_id = NEW.owner_id
    ) THEN
      RAISE EXCEPTION 'Assigned client must belong to the project owner.';
    END IF;
  END IF;

  IF NEW.cover_asset_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = NEW.cover_asset_id AND a.owner_id = NEW.owner_id
    ) THEN
      RAISE EXCEPTION 'Cover asset must belong to the project owner.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_project_relationships
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.validate_project_relationships();

-- ============================================================================
-- 5. project_members
-- ============================================================================
CREATE TABLE public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'collaborator')),
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);

-- ============================================================================
-- 6. project_invitations
-- ============================================================================
CREATE TABLE public.project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (position('@' in email) > 1),
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'collaborator')),
  token_hash TEXT NOT NULL UNIQUE CHECK (char_length(token_hash) >= 32),
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_project_invitations_project_id ON public.project_invitations(project_id);
CREATE INDEX idx_project_invitations_token_hash ON public.project_invitations(token_hash);

-- ============================================================================
-- 7. tags
-- ============================================================================
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_tags_owner_slug UNIQUE (owner_id, slug)
);

CREATE INDEX idx_tags_owner_id ON public.tags(owner_id);

-- ============================================================================
-- 8. asset_tags
-- ============================================================================
CREATE TABLE public.asset_tags (
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, tag_id)
);

CREATE INDEX idx_asset_tags_tag_id ON public.asset_tags(tag_id);

-- Prevent attaching another user's tag to an asset
CREATE OR REPLACE FUNCTION public.validate_asset_tag_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  asset_owner UUID;
  tag_owner UUID;
BEGIN
  SELECT owner_id INTO asset_owner FROM public.assets WHERE id = NEW.asset_id;
  SELECT owner_id INTO tag_owner FROM public.tags WHERE id = NEW.tag_id;

  IF asset_owner IS NULL OR tag_owner IS NULL OR asset_owner <> tag_owner THEN
    RAISE EXCEPTION 'Asset and tag must belong to the same owner.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_asset_tag_ownership
BEFORE INSERT OR UPDATE ON public.asset_tags
FOR EACH ROW EXECUTE FUNCTION public.validate_asset_tag_ownership();

-- ============================================================================
-- 9. collections
-- ============================================================================
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  description TEXT NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_collections_owner_id ON public.collections(owner_id);
CREATE INDEX idx_collections_visibility ON public.collections(visibility);

CREATE TRIGGER trg_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 10. collection_assets
-- ============================================================================
CREATE TABLE public.collection_assets (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (collection_id, asset_id)
);

CREATE INDEX idx_collection_assets_asset_id ON public.collection_assets(asset_id);

-- Ensure collection and asset belong to the same owner
CREATE OR REPLACE FUNCTION public.validate_collection_asset_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  col_owner UUID;
  ast_owner UUID;
BEGIN
  SELECT owner_id INTO col_owner FROM public.collections WHERE id = NEW.collection_id;
  SELECT owner_id INTO ast_owner FROM public.assets WHERE id = NEW.asset_id;

  IF col_owner IS NULL OR ast_owner IS NULL OR col_owner <> ast_owner THEN
    RAISE EXCEPTION 'Collection and asset must belong to the same owner.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_collection_asset_ownership
BEFORE INSERT OR UPDATE ON public.collection_assets
FOR EACH ROW EXECUTE FUNCTION public.validate_collection_asset_ownership();

-- ============================================================================
-- 11. project_assets
-- ============================================================================
CREATE TABLE public.project_assets (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'attachment' CHECK (role IN ('attachment', 'cover', 'deliverable', 'reference')),
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (project_id, asset_id)
);

CREATE INDEX idx_project_assets_asset_id ON public.project_assets(asset_id);

-- Ensure project and asset belong to the same owner
CREATE OR REPLACE FUNCTION public.validate_project_asset_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  prj_owner UUID;
  ast_owner UUID;
BEGIN
  SELECT owner_id INTO prj_owner FROM public.projects WHERE id = NEW.project_id;
  SELECT owner_id INTO ast_owner FROM public.assets WHERE id = NEW.asset_id;

  IF prj_owner IS NULL OR ast_owner IS NULL OR prj_owner <> ast_owner THEN
    RAISE EXCEPTION 'Project and asset must belong to the same owner.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_project_asset_ownership
BEFORE INSERT OR UPDATE ON public.project_assets
FOR EACH ROW EXECUTE FUNCTION public.validate_project_asset_ownership();

-- ============================================================================
-- 12. deliverable_versions
-- ============================================================================
CREATE TABLE public.deliverable_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'submitted', 'approved', 'changes_requested')),
  submitted_at TIMESTAMPTZ NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_deliverable_project_asset_version UNIQUE (project_id, asset_id, version_number)
);

CREATE INDEX idx_deliverable_versions_project_id ON public.deliverable_versions(project_id);
CREATE INDEX idx_deliverable_versions_status ON public.deliverable_versions(review_status);

-- ============================================================================
-- 13. revision_comments
-- ============================================================================
CREATE TABLE public.revision_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_version_id UUID NOT NULL REFERENCES public.deliverable_versions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  comment_type TEXT NOT NULL DEFAULT 'comment' CHECK (comment_type IN ('comment', 'revision_request', 'approval_note')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_revision_comments_deliverable_id ON public.revision_comments(deliverable_version_id);

-- ============================================================================
-- 14. activity_logs
-- ============================================================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id UUID NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (char_length(trim(event_type)) > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_activity_logs_project_id ON public.activity_logs(project_id);
CREATE INDEX idx_activity_logs_actor_id ON public.activity_logs(actor_id);
CREATE INDEX idx_activity_logs_event_type ON public.activity_logs(event_type);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- ============================================================================
-- 15. notifications
-- ============================================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id UUID NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (char_length(trim(event_type)) > 0),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_notifications_recipient_id ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread_recipient ON public.notifications(recipient_id) WHERE read_at IS NULL;

-- ============================================================================
-- 16. contact_inquiries
-- ============================================================================
CREATE TABLE public.contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL CHECK (char_length(trim(sender_name)) >= 2),
  sender_email TEXT NOT NULL CHECK (position('@' in sender_email) > 1),
  subject TEXT NULL,
  message TEXT NOT NULL CHECK (char_length(trim(message)) >= 10),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_contact_inquiries_owner_id ON public.contact_inquiries(portfolio_owner_id, created_at DESC);
CREATE INDEX idx_contact_inquiries_owner_status ON public.contact_inquiries(portfolio_owner_id, status);
