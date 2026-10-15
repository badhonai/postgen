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
  /** The project's X account has Premium → long posts (25k chars), not 280. */
  x_premium: boolean
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

/** What kind of post this is — drives the tailored composer. */
export const POST_TYPES = ['post', 'thread', 'article', 'artwork', 'quote'] as const
export type PostType = (typeof POST_TYPES)[number]

export const POST_TYPE_LABEL: Record<PostType, string> = {
  post: 'Post',
  thread: 'Thread',
  article: 'Article',
  artwork: 'Artwork',
  quote: 'Quote',
}

/** Character cap for the main content block (UI-only; the DB stores any length). */
export const POST_TYPE_LIMIT: Record<PostType, number> = {
  post: 280,
  thread: 280,
  article: 25000,
  artwork: 280,
  quote: 280,
}

/** X Premium long-post cap — applies to every type when the account has Premium. */
export const X_PREMIUM_LIMIT = 25000

/** Effective cap for a post type on this project (Premium → 25k, else 280/article 25k). */
export function postTypeLimit(type: PostType, xPremium = false): number {
  if (type === 'article') return X_PREMIUM_LIMIT
  return xPremium ? X_PREMIUM_LIMIT : POST_TYPE_LIMIT[type]
}

/** One-line hint shown under the type chips in the composer. */
export const POST_TYPE_HINT: Record<PostType, string> = {
  post: 'A single post.',
  thread: 'A thread of posts.',
  article: 'Title + long-form body.',
  artwork: 'Media first, then a caption.',
  quote: 'A quote, who said it, your take.',
}

export type Post = {
  id: string
  user_id: string
  project_id: string
  post_type: PostType
  category: PostCategory
  status: PostStatus
  title: string
  created_via: CreatedVia
  content_text: string
  content_hash: string
  scheduled_at: string | null
  published_at: string | null
  /** Type-specific extras — quote: { source, comment }. */
  meta: Record<string, unknown>
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

export const ASSET_KINDS = [
  'logo',
  'logo_full',
  'logo_icon',
  'logo_transparent_name',
  'mascot',
  'product',
  'other',
] as const

export const ASSET_KIND_LABEL: Record<string, string> = {
  logo: 'Logo (legacy)',
  logo_full: 'Full logo',
  logo_icon: 'Icon / mark only',
  logo_transparent_name: 'Transparent logo + name',
  mascot: 'Mascot',
  product: 'Product',
  other: 'Other',
}

/** ── sharing (send → accept) ── */
export type ShareItemType = 'project' | 'post' | 'prompt'
export type ShareStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

export const SHARE_ITEM_LABEL: Record<ShareItemType, string> = {
  project: 'Project',
  post: 'Post',
  prompt: 'Prompt',
}

export type Share = {
  id: string
  sender_id: string
  recipient_id: string
  item_type: ShareItemType
  item_id: string
  title: string
  payload: Record<string, unknown>
  message: string
  status: ShareStatus
  result: Record<string, unknown> | null
  created_at: string
  responded_at: string | null
  /** Joined via profiles FK for display. */
  sender?: { display_name: string | null; email: string | null } | null
  recipient?: { display_name: string | null; email: string | null } | null
}

export const TILE_COLORS = ['bg-mint', 'bg-lilac', 'bg-cream', 'bg-peach', 'bg-sky', 'bg-rose-soft'] as const

export const STATUS_DOT: Record<string, string> = {
  idea: '#b9a6f0',
  draft: '#f2c14e',
  approved: '#34c98e',
  scheduled: '#5b8def',
  published: '#4f7dff',
  archived: '#a09cc4',
}

export const STATUS_LABEL: Record<string, string> = {
  idea: 'Idea',
  draft: 'Draft',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
}
