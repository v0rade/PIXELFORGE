-- ============================================================================
-- PIXELFORGE — Creative Asset Studio
-- Migration: 20261016000002_rls_policies.sql
-- Description: Row Level Security (RLS) policies, security-definer helpers,
--              field-level protection triggers, and storage bucket policies.
-- ============================================================================

-- Ensure standard Supabase roles exist in local/test PostgreSQL environments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated;

GRANT SELECT ON
  public.profiles,
  public.projects,
  public.assets,
  public.collections,
  public.collection_assets,
  public.project_assets,
  public.tags,
  public.asset_tags
TO anon;

GRANT INSERT ON public.contact_inquiries TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- ============================================================================
-- Security-Definer Authorization Helpers (Fixed search_path = public)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id
      AND p.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_accepted_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = p_project_id
      AND pm.user_id = auth.uid()
      AND pm.accepted_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_public_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id
      AND p.visibility = 'public'
      AND p.archived_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_authorized_asset_member(p_asset_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1
      FROM public.project_assets pa
      JOIN public.project_members pm ON pm.project_id = pa.project_id
      WHERE pa.asset_id = p_asset_id
        AND pm.user_id = auth.uid()
        AND pm.accepted_at IS NOT NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.deliverable_versions dv
      JOIN public.project_members pm ON pm.project_id = dv.project_id
      WHERE dv.asset_id = p_asset_id
        AND pm.user_id = auth.uid()
        AND pm.accepted_at IS NOT NULL
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_owner(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_accepted_project_member(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_project(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_authorized_asset_member(UUID) TO anon, authenticated;

-- ============================================================================
-- Enable and Force Row Level Security on All 16 Application Tables
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members FORCE ROW LEVEL SECURITY;

ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invitations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags FORCE ROW LEVEL SECURITY;

ALTER TABLE public.asset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_tags FORCE ROW LEVEL SECURITY;

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections FORCE ROW LEVEL SECURITY;

ALTER TABLE public.collection_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_assets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.deliverable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverable_versions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.revision_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_comments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_inquiries FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. profiles Policies & Privilege Escalation Guard
-- ============================================================================

-- Prevent users from escalating their own role or changing their profile ID
CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Cannot modify profile primary key.';
  END IF;

  IF NEW.role <> OLD.role AND current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Users cannot change their authorization role.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_profile_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_sensitive_fields();

CREATE POLICY profiles_select_public
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY profiles_insert_self
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_self
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_delete_self
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- ============================================================================
-- 2. clients Policies (Strictly Private to Owner)
-- ============================================================================

CREATE POLICY clients_select_owner
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY clients_insert_owner
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY clients_update_owner
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY clients_delete_owner
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================================
-- 3. projects Policies (Owner, Accepted Client Member, or Published Public)
-- ============================================================================

CREATE POLICY projects_select_policy
  ON public.projects
  FOR SELECT
  TO anon, authenticated
  USING (
    (visibility = 'public' AND archived_at IS NULL)
    OR owner_id = auth.uid()
    OR public.is_accepted_project_member(id)
  );

CREATE POLICY projects_insert_owner
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY projects_update_owner
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY projects_delete_owner
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================================
-- 4. project_members Policies
-- ============================================================================

CREATE POLICY project_members_select_policy
  ON public.project_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_project_owner(project_id)
  );

CREATE POLICY project_members_insert_owner
  ON public.project_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_project_owner(project_id)
    AND invited_by = auth.uid()
  );

CREATE POLICY project_members_update_owner
  ON public.project_members
  FOR UPDATE
  TO authenticated
  USING (public.is_project_owner(project_id))
  WITH CHECK (public.is_project_owner(project_id));

CREATE POLICY project_members_delete_owner
  ON public.project_members
  FOR DELETE
  TO authenticated
  USING (public.is_project_owner(project_id) OR user_id = auth.uid());

-- ============================================================================
-- 5. project_invitations Policies (Never Publicly Readable)
-- ============================================================================

CREATE POLICY project_invitations_select_owner
  ON public.project_invitations
  FOR SELECT
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR public.is_project_owner(project_id)
  );

CREATE POLICY project_invitations_insert_owner
  ON public.project_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND public.is_project_owner(project_id)
  );

CREATE POLICY project_invitations_update_owner
  ON public.project_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR public.is_project_owner(project_id)
  )
  WITH CHECK (
    invited_by = auth.uid()
    OR public.is_project_owner(project_id)
  );

CREATE POLICY project_invitations_delete_owner
  ON public.project_invitations
  FOR DELETE
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR public.is_project_owner(project_id)
  );

-- ============================================================================
-- 6. assets Policies
-- ============================================================================

-- Prevent changing owner_id or storage_path after creation
CREATE OR REPLACE FUNCTION public.guard_asset_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id <> OLD.owner_id THEN
    RAISE EXCEPTION 'Asset ownership cannot be transferred.';
  END IF;
  IF NEW.storage_path <> OLD.storage_path THEN
    RAISE EXCEPTION 'Asset storage_path is immutable after creation.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_asset_immutable_fields
BEFORE UPDATE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.guard_asset_immutable_fields();

CREATE POLICY assets_select_policy
  ON public.assets
  FOR SELECT
  TO anon, authenticated
  USING (
    deleted_at IS NULL
    AND (
      visibility = 'public'
      OR owner_id = auth.uid()
      OR public.is_authorized_asset_member(id)
    )
  );

CREATE POLICY assets_insert_owner
  ON public.assets
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY assets_update_owner
  ON public.assets
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY assets_delete_owner
  ON public.assets
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================================
-- 7. tags & asset_tags Policies
-- ============================================================================

CREATE POLICY tags_select_policy
  ON public.tags
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY tags_insert_owner
  ON public.tags
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY tags_update_owner
  ON public.tags
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY tags_delete_owner
  ON public.tags
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY asset_tags_select_policy
  ON public.asset_tags
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = public.asset_tags.asset_id
        AND a.deleted_at IS NULL
        AND (a.visibility = 'public' OR a.owner_id = auth.uid())
    )
  );

CREATE POLICY asset_tags_insert_owner
  ON public.asset_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = public.asset_tags.asset_id AND a.owner_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.tags t
      WHERE t.id = public.asset_tags.tag_id AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY asset_tags_delete_owner
  ON public.asset_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = public.asset_tags.asset_id AND a.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. collections & collection_assets Policies
-- ============================================================================

CREATE POLICY collections_select_policy
  ON public.collections
  FOR SELECT
  TO anon, authenticated
  USING (
    visibility = 'public'
    OR owner_id = auth.uid()
  );

CREATE POLICY collections_insert_owner
  ON public.collections
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY collections_update_owner
  ON public.collections
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY collections_delete_owner
  ON public.collections
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY collection_assets_select_policy
  ON public.collection_assets
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = public.collection_assets.collection_id
        AND (c.visibility = 'public' OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY collection_assets_insert_owner
  ON public.collection_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = public.collection_assets.collection_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY collection_assets_delete_owner
  ON public.collection_assets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = public.collection_assets.collection_id
        AND c.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. project_assets Policies
-- ============================================================================

CREATE POLICY project_assets_select_policy
  ON public.project_assets
  FOR SELECT
  TO anon, authenticated
  USING (
    public.is_public_project(project_id)
    OR public.is_project_owner(project_id)
    OR public.is_accepted_project_member(project_id)
  );

CREATE POLICY project_assets_insert_owner
  ON public.project_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_owner(project_id));

CREATE POLICY project_assets_update_owner
  ON public.project_assets
  FOR UPDATE
  TO authenticated
  USING (public.is_project_owner(project_id))
  WITH CHECK (public.is_project_owner(project_id));

CREATE POLICY project_assets_delete_owner
  ON public.project_assets
  FOR DELETE
  TO authenticated
  USING (public.is_project_owner(project_id));

-- ============================================================================
-- 10. deliverable_versions Policies & Status Transition Guard
-- ============================================================================

-- Guard deliverable_versions updates so clients can only review submitted deliverables
CREATE OR REPLACE FUNCTION public.guard_deliverable_version_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id <> OLD.project_id OR NEW.asset_id <> OLD.asset_id OR NEW.version_number <> OLD.version_number OR NEW.submitted_by <> OLD.submitted_by THEN
    RAISE EXCEPTION 'Deliverable structural fields are immutable.';
  END IF;

  -- If caller is not the project owner, they must be an accepted project member
  -- and may only transition review_status from 'submitted' to 'approved' or 'changes_requested'
  IF NOT public.is_project_owner(OLD.project_id) THEN
    IF NOT public.is_accepted_project_member(OLD.project_id) THEN
      RAISE EXCEPTION 'Unauthorized deliverable review action.';
    END IF;
    IF OLD.review_status <> 'submitted' OR NEW.review_status NOT IN ('approved', 'changes_requested') THEN
      RAISE EXCEPTION 'Clients may only approve or request changes on submitted deliverables.';
    END IF;
    NEW.reviewed_at = timezone('utc', now());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_deliverable_version_update
BEFORE UPDATE ON public.deliverable_versions
FOR EACH ROW EXECUTE FUNCTION public.guard_deliverable_version_update();

CREATE POLICY deliverable_versions_select_policy
  ON public.deliverable_versions
  FOR SELECT
  TO authenticated
  USING (
    public.is_project_owner(project_id)
    OR public.is_accepted_project_member(project_id)
  );

CREATE POLICY deliverable_versions_insert_owner
  ON public.deliverable_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_project_owner(project_id)
    AND submitted_by = auth.uid()
  );

CREATE POLICY deliverable_versions_update_authorized
  ON public.deliverable_versions
  FOR UPDATE
  TO authenticated
  USING (
    public.is_project_owner(project_id)
    OR public.is_accepted_project_member(project_id)
  )
  WITH CHECK (
    public.is_project_owner(project_id)
    OR public.is_accepted_project_member(project_id)
  );

CREATE POLICY deliverable_versions_delete_owner
  ON public.deliverable_versions
  FOR DELETE
  TO authenticated
  USING (public.is_project_owner(project_id));

-- ============================================================================
-- 11. revision_comments Policies
-- ============================================================================

CREATE POLICY revision_comments_select_authorized
  ON public.revision_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deliverable_versions dv
      WHERE dv.id = public.revision_comments.deliverable_version_id
        AND (
          public.is_project_owner(dv.project_id)
          OR public.is_accepted_project_member(dv.project_id)
        )
    )
  );

CREATE POLICY revision_comments_insert_authorized
  ON public.revision_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.deliverable_versions dv
      WHERE dv.id = public.revision_comments.deliverable_version_id
        AND (
          public.is_project_owner(dv.project_id)
          OR public.is_accepted_project_member(dv.project_id)
        )
    )
  );

-- ============================================================================
-- 12. activity_logs Policies (No Forged Client Audit Events)
-- ============================================================================

CREATE POLICY activity_logs_select_authorized
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    actor_id = auth.uid()
    OR (project_id IS NOT NULL AND public.is_project_owner(project_id))
    OR (project_id IS NOT NULL AND public.is_accepted_project_member(project_id))
  );

CREATE POLICY activity_logs_insert_authorized
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (
      project_id IS NULL
      OR public.is_project_owner(project_id)
      OR public.is_accepted_project_member(project_id)
    )
  );

-- ============================================================================
-- 13. notifications Policies (Recipients Only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_notification_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.recipient_id <> OLD.recipient_id
     OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
     OR NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.event_type <> OLD.event_type
     OR NEW.payload <> OLD.payload THEN
    RAISE EXCEPTION 'Only read_at may be updated on a notification.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_notification_update
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.guard_notification_update();

CREATE POLICY notifications_select_recipient
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY notifications_insert_authorized
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (
      project_id IS NULL
      OR public.is_project_owner(project_id)
      OR public.is_accepted_project_member(project_id)
    )
  );

CREATE POLICY notifications_update_recipient
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- ============================================================================
-- 14. contact_inquiries Policies (Insert Public, Read/Manage Owner Only)
-- ============================================================================

CREATE POLICY contact_inquiries_insert_public
  ON public.contact_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = portfolio_owner_id AND p.role = 'owner'
    )
  );

CREATE POLICY contact_inquiries_select_owner
  ON public.contact_inquiries
  FOR SELECT
  TO authenticated
  USING (portfolio_owner_id = auth.uid());

CREATE POLICY contact_inquiries_update_owner
  ON public.contact_inquiries
  FOR UPDATE
  TO authenticated
  USING (portfolio_owner_id = auth.uid())
  WITH CHECK (portfolio_owner_id = auth.uid());

CREATE POLICY contact_inquiries_delete_owner
  ON public.contact_inquiries
  FOR DELETE
  TO authenticated
  USING (portfolio_owner_id = auth.uid());

-- ============================================================================
-- 15. Private Storage Bucket Configuration (creative-assets)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'creative-assets',
      'creative-assets',
      false,
      52428800,
      ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'application/pdf',
        'application/zip'
      ]
    )
    ON CONFLICT (id) DO UPDATE
      SET public = false,
          file_size_limit = 52428800;
  END IF;
END
$$;
