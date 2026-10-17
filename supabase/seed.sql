-- ============================================================================
-- PIXELFORGE — Creative Asset Studio
-- Repeatable Seed Strategy (supabase/seed.sql)
-- ============================================================================

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'sora@pixelforge.studio',
    '{"display_name": "Sora Vance", "username": "sora-vance", "role": "owner"}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'other@pixelforge.studio',
    '{"display_name": "Kaelen Mercer", "username": "kaelen-mercer", "role": "owner"}'::jsonb
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'elena@aether-concept.example',
    '{"display_name": "Dr. Elena Rostova", "username": "elena-rostova", "role": "client"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Update deterministic usernames for seed profiles
UPDATE public.profiles
SET
  display_name = 'Sora Vance',
  username = 'sora-vance',
  bio = 'Independent graphic designer and visual systems architect focused on modular brand identities, design token frameworks, and kinetic editorial graphics.',
  website_url = 'https://pixelforge.studio/sora-vance',
  social_links = '{"github": "https://github.com", "behance": "https://behance.net", "dribbble": "https://dribbble.com"}'::jsonb
WHERE id = '11111111-1111-4111-8111-111111111111';

-- Seed Clients for Owner A
INSERT INTO public.clients (id, owner_id, name, email, company, notes)
VALUES (
  'aaaaaaaa-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  'Dr. Elena Rostova',
  'elena@aether-concept.example',
  'Aether Research Lab (Concept)',
  'Internal owner note: Prefers vector SVG deliverables with Display-P3 tokens.'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Assets for Owner A (1 public, 1 private)
INSERT INTO public.assets (
  id, owner_id, name, description, original_filename, storage_path,
  mime_type, file_size, width, height, category, visibility
)
VALUES
  (
    'bbbbbbbb-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Aether Modular Brand Identity Sheet',
    'Primary logomark construction grid and optical kerning specification.',
    'aether-brand-identity-v3.svg',
    'creative-assets/11111111-1111-4111-8111-111111111111/2026/10/aether-brand-identity-v3.svg',
    'image/svg+xml',
    482910,
    2400,
    1600,
    'Brand Identity',
    'public'
  ),
  (
    'bbbbbbbb-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'Monolith Hardware Packaging Dieline Rev. B',
    'Private CAD dieline with bleed and crease layers.',
    'monolith-rigid-box-dieline-revB.pdf',
    'creative-assets/11111111-1111-4111-8111-111111111111/2026/10/monolith-rigid-box-dieline-revB.pdf',
    'application/pdf',
    12910592,
    3600,
    2400,
    'Marketing Collateral',
    'private'
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Projects for Owner A (1 public, 1 private)
INSERT INTO public.projects (
  id, owner_id, client_id, title, slug, description, brief,
  category, cover_asset_id, status, priority, visibility, featured,
  start_date, due_date, published_at
)
VALUES
  (
    'cccccccc-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-1111-4111-8111-111111111111',
    'Aether Modular Brand Architecture',
    'aether-modular-brand-architecture',
    'Complete visual identity system and tokenized brand manual.',
    'Develop a scalable technical brand architecture.',
    'Brand Identity',
    'bbbbbbbb-1111-4111-8111-111111111111',
    'completed',
    'high',
    'public',
    true,
    '2026-08-15',
    '2026-10-05',
    '2026-10-06T12:00:00Z'
  ),
  (
    'cccccccc-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-1111-4111-8111-111111111111',
    'Monolith Reference Enclosure Packaging',
    'monolith-reference-packaging',
    'Private collector-grade rigid box structural dielines.',
    'Design sustainable molded pulp and rigid board packaging.',
    'Marketing Collateral',
    'bbbbbbbb-2222-4222-8222-222222222222',
    'in_review',
    'high',
    'private',
    false,
    '2026-09-22',
    '2026-10-20',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- Authorize Client C on Project 2 (private project)
INSERT INTO public.project_members (project_id, user_id, role, invited_by, accepted_at)
VALUES (
  'cccccccc-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  'client',
  '11111111-1111-4111-8111-111111111111',
  '2026-09-23T10:00:00Z'
)
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Link private asset to private project
INSERT INTO public.project_assets (project_id, asset_id, role, position)
VALUES (
  'cccccccc-2222-4222-8222-222222222222',
  'bbbbbbbb-2222-4222-8222-222222222222',
  'deliverable',
  0
)
ON CONFLICT (project_id, asset_id) DO NOTHING;

-- Seed Deliverable Version for Project 2
INSERT INTO public.deliverable_versions (
  id, project_id, asset_id, version_number, submitted_by, review_status, submitted_at
)
VALUES (
  'dddddddd-1111-4111-8111-111111111111',
  'cccccccc-2222-4222-8222-222222222222',
  'bbbbbbbb-2222-4222-8222-222222222222',
  1,
  '11111111-1111-4111-8111-111111111111',
  'submitted',
  '2026-10-14T11:30:00Z'
)
ON CONFLICT (id) DO NOTHING;
