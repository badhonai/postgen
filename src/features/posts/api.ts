import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Asset, Post, PostCategory, PostStatus, PostTweet, PostType } from '../../lib/types'

export type PostListItem = Pick<
  Post,
  | 'id'
  | 'project_id'
  | 'post_type'
  | 'category'
  | 'status'
  | 'title'
  | 'created_via'
  | 'content_text'
  | 'created_at'
  | 'updated_at'
  | 'published_at'
  | 'meta'
> & {
  /** First image asset attached to the post, for the 16:9 list thumbnail. */
  cover?: { r2_key: string; mime_type: string; filename: string } | null
}

export type PostFilters = {
  projectId?: string
  search?: string
  status?: PostStatus | ''
  category?: PostCategory | ''
  type?: PostType | ''
  postTypes?: PostType[]
  tag?: string
}

export function usePosts(filters: PostFilters = {}) {
  const { projectId, search, status, category, type, postTypes, tag } = filters
  return useQuery({
    queryKey: ['posts', { projectId, search, status, category, type, postTypes, tag }],
    enabled: !!supabase,
    queryFn: async (): Promise<PostListItem[]> => {
      let q = supabase!
        .from('posts')
        .select(
          'id, project_id, post_type, category, status, title, created_via, content_text, created_at, updated_at, published_at, meta,' +
            ' post_tweets(id, post_media(asset_id, assets(id, r2_key, mime_type, filename)))',
        )
        .order('updated_at', { ascending: false })

      if (projectId) q = q.eq('project_id', projectId)
      if (status) q = q.eq('status', status)
      if (category) q = q.eq('category', category)
      if (type) q = q.eq('post_type', type)
      else if (postTypes && postTypes.length > 0) q = q.in('post_type', postTypes)
      if (tag) {
        const { data: tagRow, error: tagErr } = await supabase!
          .from('tags')
          .select('id')
          .eq('name', tag)
          .maybeSingle()
        if (tagErr) throw tagErr
        if (!tagRow) return []
        const { data: links, error: linkErr } = await supabase!
          .from('post_tags')
          .select('post_id')
          .eq('tag_id', tagRow.id)
        if (linkErr) throw linkErr
        const ids = (links ?? []).map((l) => l.post_id)
        if (ids.length === 0) return []
        q = q.in('id', ids)
      }
      if (search) q = q.textSearch('search_vector', search, { type: 'websearch' })

      const { data, error } = await q
      if (error) throw error
      // Pick the first image asset attached anywhere in the thread as the list thumbnail.
      const rows = ((data ?? []) as unknown as Array<PostListItem & {
        post_tweets?: Array<{ post_media?: Array<{ assets?: PostListItem['cover'] | null } | null> | null }> | null
      }>).map((row) => {
        const cover = (row.post_tweets ?? [])
          .flatMap((t) => t.post_media ?? [])
          .map((m) => m?.assets ?? null)
          .find((a) => a && a.mime_type?.startsWith('image/'))
        const { post_tweets: _drop, ...rest } = row
        return { ...rest, cover: cover ?? null }
      })
      return rows
    },
  })
}

export type PostDetail = Post & {
  post_tweets: PostTweet[]
  tags: string[]
  mediaByTweet: Record<string, Asset[]>
}

export function usePost(id: string) {
  return useQuery({
    queryKey: ['posts', id],
    enabled: !!supabase && !!id,
    queryFn: async (): Promise<PostDetail | null> => {
      const { data, error } = await supabase!
        .from('posts')
        .select('*, post_tweets(*), post_tags(tags(name))')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const row = data as unknown as Post & {
        post_tweets: PostTweet[]
        post_tags: Array<{ tags: { name: string } | null }>
      }
      const tweets = [...row.post_tweets].sort((a, b) => a.position - b.position)

      const mediaByTweet: Record<string, Asset[]> = {}
      const tweetIds = tweets.map((t) => t.id)
      if (tweetIds.length > 0) {
        const { data: mediaRows, error: mediaErr } = await supabase!
          .from('post_media')
          .select('post_tweet_id, position, assets(*)')
          .in('post_tweet_id', tweetIds)
          .order('position')
        if (mediaErr) throw mediaErr
        for (const r of (mediaRows ?? []) as unknown as Array<{
          post_tweet_id: string
          assets: Asset | null
        }>) {
          if (!r.assets) continue
          ;(mediaByTweet[r.post_tweet_id] ??= []).push(r.assets)
        }
      }

      return {
        ...row,
        post_tweets: tweets,
        tags: row.post_tags.map((pt) => pt.tags?.name).filter((n): n is string => !!n),
        mediaByTweet,
      }
    },
  })
}

export type SavePostInput = {
  postId?: string
  projectId: string
  type: PostType
  category: PostCategory
  status: PostStatus
  title: string
  tweets: string[]
  tagNames: string[]
  contentText: string
  contentHash: string
  /** Attachments keyed by tweet index (0-based) in the `tweets` array. */
  media: Array<{ tweetIndex: number; asset: Asset }>
  /** Type-specific extras — quote: { source, comment }. */
  meta?: Record<string, unknown>
  /** Preserved on import; otherwise defaults to 'web'. */
  createdVia?: 'web' | 'api' | 'mcp'
}

export function useSavePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SavePostInput): Promise<string> => {
      const counters: Record<number, number> = {}
      const p_media = input.media.map((m) => {
        counters[m.tweetIndex] = (counters[m.tweetIndex] ?? 0) + 1
        return {
          tweet_position: m.tweetIndex + 1,
          asset_id: m.asset.id,
          position: counters[m.tweetIndex],
        }
      })
      const { data, error } = await supabase!.rpc('save_post_with_tweets', {
        p_post_id: input.postId ?? null,
        p_project_id: input.projectId,
        p_category: input.category,
        p_status: input.status,
        p_title: input.title,
        p_content_text: input.contentText,
        p_content_hash: input.contentHash,
        p_tweets: input.tweets,
        p_tag_names: input.tagNames,
        p_media: p_media,
        p_created_via: input.createdVia ?? 'web',
        p_post_type: input.type ?? 'post',
        p_meta: input.meta ?? {},
      })
      if (error) throw error
      return data as string
    },
    onSuccess: (postId) => {
      void qc.invalidateQueries({ queryKey: ['posts'] })
      void qc.invalidateQueries({ queryKey: ['posts', postId] })
    },
  })
}

/**
 * Move several posts to one status at once. Mirrors `save_post_with_tweets`:
 * publishing stamps `published_at` (only for posts never published), and any
 * non-published status clears it.
 */
export function useBulkSetStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ posts, status }: { posts: PostListItem[]; status: PostStatus }): Promise<void> => {
      const ids = posts.map((p) => p.id)
      if (ids.length === 0) return
      const now = new Date().toISOString()
      if (status === 'published') {
        const fresh = posts.filter((p) => !p.published_at).map((p) => p.id)
        if (fresh.length > 0) {
          const { error } = await supabase!.from('posts').update({ status, published_at: now }).in('id', fresh)
          if (error) throw error
        }
        const rest = ids.filter((id) => !fresh.includes(id))
        if (rest.length > 0) {
          const { error } = await supabase!.from('posts').update({ status }).in('id', rest)
          if (error) throw error
        }
        return
      }
      const { error } = await supabase!.from('posts').update({ status, published_at: null }).in('id', ids)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['posts'] }),
  })
}

/** Move ONE post to a status (used by the "Did you post it?" confirm). */
export function useSetPostStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PostStatus }): Promise<void> => {
      const patch =
        status === 'published'
          ? { status, published_at: new Date().toISOString() }
          : { status, published_at: null }
      const { error } = await supabase!.from('posts').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: ['posts'] })
      void qc.invalidateQueries({ queryKey: ['posts', id] })
    },
  })
}

/** Delete several posts at once — post_tweets/post_media/post_tags cascade. */
export function useBulkDeletePosts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]): Promise<void> => {
      if (ids.length === 0) return
      const { error } = await supabase!.from('posts').delete().in('id', ids)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['posts'] }),
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase!.from('posts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['posts'] }),
  })
}
