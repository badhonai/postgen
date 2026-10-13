import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Post, PostCategory, PostStatus, PostTweet } from '../../lib/types'

export type PostListItem = Pick<
  Post,
  | 'id'
  | 'project_id'
  | 'category'
  | 'status'
  | 'title'
  | 'created_via'
  | 'content_text'
  | 'created_at'
  | 'updated_at'
>

export type PostFilters = {
  projectId?: string
  search?: string
  status?: PostStatus | ''
  category?: PostCategory | ''
  tag?: string
}

export function usePosts(filters: PostFilters = {}) {
  const { projectId, search, status, category, tag } = filters
  return useQuery({
    queryKey: ['posts', { projectId, search, status, category, tag }],
    enabled: !!supabase,
    queryFn: async (): Promise<PostListItem[]> => {
      let q = supabase!
        .from('posts')
        .select(
          'id, project_id, category, status, title, created_via, content_text, created_at, updated_at',
        )
        .order('updated_at', { ascending: false })

      if (projectId) q = q.eq('project_id', projectId)
      if (status) q = q.eq('status', status)
      if (category) q = q.eq('category', category)
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
      return data as unknown as PostListItem[]
    },
  })
}

export type PostDetail = Post & {
  post_tweets: PostTweet[]
  tags: string[]
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
      return {
        ...row,
        post_tweets: [...row.post_tweets].sort((a, b) => a.position - b.position),
        tags: row.post_tags.map((pt) => pt.tags?.name).filter((n): n is string => !!n),
      }
    },
  })
}

export type SavePostInput = {
  postId?: string
  projectId: string
  category: PostCategory
  status: PostStatus
  title: string
  tweets: string[]
  tagNames: string[]
  contentText: string
  contentHash: string
}

export function useSavePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SavePostInput): Promise<string> => {
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
