import { supabase } from './supabase'
import { sha256Hex, threadToContentText } from './text'

export type SimilarPost = {
  id: string
  title: string
  project_id: string
  similarity: number
}

export type DupCheck = {
  contentText: string
  contentHash: string
  /** id of an exact duplicate (identical normalized content) */
  duplicateOf: string | null
  /** near-duplicates & related posts, most similar first */
  similar: SimilarPost[]
}

/** Posts at/above this similarity are treated as repeats and blocked. */
export const SIMILARITY_BLOCK = 0.65
/** Posts at/above this similarity are shown as "related" in the dialog. */
export const SIMILARITY_SHOW = 0.45

/**
 * "No repeat posts" check — runs before every create/update save.
 * Scope: the current user's posts only (RLS). Never sees anyone else's data.
 */
export async function checkDuplicates(
  tweets: string[],
  opts: { excludePostId?: string; projectId?: string } = {},
): Promise<DupCheck> {
  const contentText = threadToContentText(tweets)
  const contentHash = await sha256Hex(contentText)
  const { data: userData } = await supabase!.auth.getUser()
  const userId = userData.user?.id ?? null

  const [exact, similar] = await Promise.all([
    supabase!.rpc('find_duplicate_post', {
      p_content_hash: contentHash,
      p_user_id: userId,
      // Exclude the post being edited — otherwise an edit matches ITSELF
      // (identical hash) and every save of an existing post is blocked.
      p_exclude_post_id: opts.excludePostId ?? null,
    }),
    supabase!.rpc('find_similar_posts', {
      p_content_text: contentText,
      p_exclude_post_id: opts.excludePostId ?? null,
      p_project_id: opts.projectId ?? null,
      p_threshold: SIMILARITY_SHOW,
      p_user_id: userId,
    }),
  ])

  if (exact.error) throw exact.error
  if (similar.error) throw similar.error

  return {
    contentText,
    contentHash,
    duplicateOf: (exact.data as string | null) ?? null,
    similar: (similar.data ?? []) as SimilarPost[],
  }
}

export function hasBlockingDuplicates(check: DupCheck): boolean {
  return (
    check.duplicateOf !== null ||
    check.similar.some((s) => s.similarity >= SIMILARITY_BLOCK)
  )
}

/** Exact-duplicate lookup by content hash (used by import). */
export async function findExactDuplicate(contentHash: string): Promise<string | null> {
  const { data, error } = await supabase!.rpc('find_duplicate_post', {
    p_content_hash: contentHash,
  })
  if (error) throw error
  return (data as string | null) ?? null
}
