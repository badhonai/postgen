/**
 * Database row types — mirror of supabase/migrations/20261012000001_init.sql
 */

export type BrandVoice = {
  tone?: string
  /** Words/symbols the agent must never use. Server-enforced on agent writes. */
  blacklist?: string[]
  /** @deprecated migrated to `blacklist` — kept for old exported bundles. */
  tabooWords?: string[]
}

export type OfficialLink = { label: string; url: string }

export type Profile = {
  id: string
  display_name: string | null
  created_at: string
  updated_at: string
}

export type Project = {
  id: string
  user_id: string
  name: string
  slug: string
  description: string | null
  brand_voice: BrandVoice
  x_username: string | null
  website_url: string | null
  content_pillars: string[]
  sample_posts: string[]
  custom_instructions: string | null
  official_links: OfficialLink[]
  logo_asset_id: string | null
  /** Populated via FK embed when listed (`logo:assets!projects_logo_asset_id_fkey(r2_key)`). */
  logo?: { r2_key: string } | null
  created_at: string
  updated_at: string
}

export type KnowledgeKind = 'knowledge' | 'source'

export type Knowledge = {
  id: string
  user_id: string
  project_id: string
  kind: KnowledgeKind
  title: string
  content: string | null
  url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type PostCategory = 'promotional' | 'educational' | 'announcement' | 'other'
export type PostStatus = 'idea' | 'draft' | 'approved' | 'scheduled' | 'published' | 'archived'
export type CreatedVia = 'web' | 'api' | 'mcp'

export type Post = {
  id: string
  user_id: string
  project_id: string
  category: PostCategory
  status: PostStatus
  title: string
  created_via: CreatedVia
  content_text: string
  content_hash: string
  scheduled_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export type PostTweet = {
  id: string
  post_id: string
  position: number
  content: string
  created_at: string
  updated_at: string
}

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  promotional: 'Promotional',
  educational: 'Educational',
  announcement: 'Announcement',
  other: 'Other',
}

export type Asset = {
  id: string
  user_id: string
  project_id: string
  r2_key: string
  filename: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  alt_text: string | null
  /** Role label: logo | mascot | product | other (free text). */
  kind: string
  created_at: string
  updated_at: string
}

export const ASSET_KINDS = ['logo', 'mascot', 'product', 'other'] as const
