/**
 * Database row types — mirror of supabase/migrations/20261012000001_init.sql
 */

export type BrandVoice = {
  tone?: string
  emojiPolicy?: 'none' | 'light' | 'any' | string
  tabooWords?: string[]
  hashtags?: string[]
  ctaStyle?: string
}

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
