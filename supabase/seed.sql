-- ============================================================
-- SkillGRID — seed.sql   (supabase db seed)
-- Skill catalog + optional allowlist rows.
-- ============================================================

INSERT INTO public.skill_tags (name, category) VALUES
  -- Programming
  ('Python', 'Programming'),
  ('JavaScript', 'Programming'),
  ('TypeScript', 'Programming'),
  ('React', 'Programming'),
  ('Next.js', 'Programming'),
  ('Node.js', 'Programming'),
  ('Java', 'Programming'),
  ('C++', 'Programming'),
  ('Go', 'Programming'),
  ('Rust', 'Programming'),
  ('SQL', 'Programming'),
  ('Git', 'Programming'),
  -- Data & AI
  ('Data Analysis', 'Data & AI'),
  ('Machine Learning', 'Data & AI'),
  ('Data Visualization', 'Data & AI'),
  ('Statistics', 'Data & AI'),
  ('Excel', 'Data & AI'),
  -- Design
  ('UI/UX Design', 'Design'),
  ('Figma', 'Design'),
  ('Graphic Design', 'Design'),
  ('Video Editing', 'Design'),
  -- Language
  ('English Conversation', 'Language'),
  ('IELTS Preparation', 'Language'),
  ('Spanish', 'Language'),
  ('French', 'Language'),
  ('German', 'Language'),
  ('Mandarin', 'Language'),
  ('Japanese', 'Language'),
  -- Academic
  ('Calculus', 'Academic'),
  ('Physics', 'Academic'),
  ('Chemistry', 'Academic'),
  ('Essay Writing', 'Academic'),
  ('Public Speaking', 'Academic'),
  -- Engineering & Ops
  ('Docker', 'Engineering & Ops'),
  ('Linux', 'Engineering & Ops'),
  ('AWS', 'Engineering & Ops'),
  ('Networking', 'Engineering & Ops'),
  ('Cybersecurity', 'Engineering & Ops'),
  -- Creative & Misc
  ('Guitar', 'Creative & Misc'),
  ('Photography', 'Creative & Misc'),
  ('Cooking', 'Creative & Misc'),
  ('Chess', 'Creative & Misc')
ON CONFLICT (lower(name)) DO NOTHING;

-- ------------------------------------------------------------
-- Institutional email allowlist.
-- Leave EMPTY to allow every domain (development default).
-- To restrict signups, uncomment and add your domains:
-- ------------------------------------------------------------
-- INSERT INTO public.allowed_email_domains (domain) VALUES
--   ('university.edu'),
--   ('college.edu');

-- ------------------------------------------------------------
-- First administrator (run AFTER signing up with your account,
-- replace the email):
-- ------------------------------------------------------------
-- UPDATE public.profiles SET is_admin = true
-- WHERE email = 'you@university.edu';
