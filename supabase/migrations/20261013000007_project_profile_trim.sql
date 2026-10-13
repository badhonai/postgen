-- ============================================================
-- PostGen — 20261013000007_project_profile_trim.sql
-- Trim the project profile to the fields we actually want:
-- REMOVE  chains, token_ticker, contract_addresses
--         (and brand_voice emojiPolicy / hashtags / ctaStyle)
-- KEEP    logo + assets, name, description/context, X username,
--         website, official links, tone & voice, blacklist,
--         custom instructions, content pillars, sample posts
-- ============================================================

alter table public.projects
  drop column if exists chains,
  drop column if exists token_ticker,
  drop column if exists contract_addresses;

update public.projects
set brand_voice = brand_voice - 'emojiPolicy' - 'hashtags' - 'ctaStyle'
where brand_voice ? 'emojiPolicy' or brand_voice ? 'hashtags' or brand_voice ? 'ctaStyle';
