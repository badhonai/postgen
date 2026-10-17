import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { sha256Hex, threadToContentText } from '../../lib/text'
import { findExactDuplicate } from '../../lib/dedupe'
import { rememberRecipient } from '../../lib/recipients'
import type {
  Asset,
  PostCategory,
  PostStatus,
  PostType,
  Share,
  ShareItemType,
} from '../../lib/types'

/**
 * Sharing: send a project / post / prompt to another PostGen user.
 * The share row carries a frozen payload snapshot; accepting imports an
 * independent copy into the recipient's account. Nothing shows up for
 * the recipient until they accept. Accepting the same item again does
 * NOT duplicate it: share_imports remembers the recipient's copy, and
 * re-accepting updates that copy in place (flagged as an update).
 */

export type ShareAssetPayload = {
  r2_key: string
  filename: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  alt_text: string | null
  kind: string
}

export type SharePostPayload = {
  source_item_id?: string
  source_project_id?: string | null
  source_updated_at?: string | null
  /** Source project's identity — lets the recipient match the local
   *  project that already represents it (no duplicate projects). */
  project_slug?: string | null
  project_x_username?: string | null
  title: string
  type: PostType
  category: PostCategory
  status: PostStatus
  tweets: string[]
  tags: string[]
  meta: Record<string, unknown>
  /** tweet_index is 0-based into `tweets`. */
  media: Array<{ tweet_index: number; asset: ShareAssetPayload }>
  project_name?: string
}

export type ShareProjectPayload = {
  project: {
    name: string
    slug: string
    description: string | null
    brand_voice: Record<string, unknown>
    x_username: string | null
    website_url: string | null
    content_pillars: string[]
    sample_posts: string[]
    custom_instructions: string | null
    official_links: unknown[]
    /** Logo files travel with the project (posts/other media never do). */
    logos: ShareAssetPayload[]
    /** r2_key of the primary logo (projects.logo_asset_id), if any. */
    logo_r2_key: string | null
  }
  knowledge: Array<{
    kind: string
    title: string
    content: string | null
    url: string | null
    notes: string | null
  }>
  source_item_id?: string
  source_updated_at?: string | null
}

export type SharePromptPayload = {
  source_item_id?: string
  source_updated_at?: string | null
  name: string
  prompt: string
  notes: string
  /** Cover images travel with the prompt now (they show the output). */
  reference_assets?: Array<
    ShareAssetPayload & {
      source_project_name?: string | null
      source_project_slug?: string | null
      source_project_x_username?: string | null
    }
  >
  use_reference_images?: boolean
  color_codes?: string[]
  /**
   * The prompt's project tags. Ids are account-local, so the projects
   * travel as descriptors and are re-matched on the recipient's side —
   * without this the imported prompt arrives untagged.
   */
  projects?: Array<{ name: string; slug: string | null; x_username: string | null }>
}

const assetPayload = (a: Asset): ShareAssetPayload => ({
  r2_key: a.r2_key,
  filename: a.filename,
  mime_type: a.mime_type,
  size_bytes: a.size_bytes,
  width: a.width,
  height: a.height,
  alt_text: a.alt_text,
  kind: a.kind ?? 'other',
})

type RawPostRow = {
  id: string
  project_id?: string | null
  updated_at?: string | null
  title: string
  post_type: PostType
  category: PostCategory
  status: PostStatus
  meta: Record<string, unknown> | null
  post_tweets: Array<{ id: string; position: number; content: string }>
  post_tags: Array<{ tags: { name: string } | null }>
}

/** Media for a set of posts, keyed by post id → tweet index → assets. */
async function mediaForPosts(
  rows: RawPostRow[],
): Promise<Map<string, Array<{ tweet_index: number; asset: ShareAssetPayload }>>> {
  const out = new Map<string, Array<{ tweet_index: number; asset: ShareAssetPayload }>>()
  const tweetOwner = new Map<string, { postId: string; index: number }>()
  for (const row of rows) {
    const tweets = [...row.post_tweets].sort((a, b) => a.position - b.position)
    tweets.forEach((t, i) => tweetOwner.set(t.id, { postId: row.id, index: i }))
  }
  const tweetIds = [...tweetOwner.keys()]
  if (tweetIds.length === 0) return out
  const { data, error } = await supabase!
    .from('post_media')
    .select('post_tweet_id, position, assets(*)')
    .in('post_tweet_id', tweetIds)
    .order('position')
  if (error) throw error
  for (const r of (data ?? []) as unknown as Array<{ post_tweet_id: string; assets: Asset | null }>) {
    const owner = tweetOwner.get(r.post_tweet_id)
    if (!owner || !r.assets) continue
    const list = out.get(owner.postId) ?? []
    list.push({ tweet_index: owner.index, asset: assetPayload(r.assets) })
    out.set(owner.postId, list)
  }
  return out
}

const postPayload = (
  row: RawPostRow,
  media: Array<{ tweet_index: number; asset: ShareAssetPayload }>,
  projectName?: string,
): SharePostPayload => ({
  source_item_id: row.id,
  source_project_id: row.project_id ?? null,
  source_updated_at: row.updated_at ?? null,
  title: row.title,
  type: row.post_type ?? 'post',
  category: row.category,
  status: row.status,
  tweets: [...row.post_tweets].sort((a, b) => a.position - b.position).map((t) => t.content),
  tags: row.post_tags.map((pt) => pt.tags?.name).filter((n): n is string => !!n),
  meta: row.meta ?? {},
  media,
  project_name: projectName,
})

const POST_SELECT = 'id, project_id, updated_at, title, post_type, category, status, meta, post_tweets(id, position, content), post_tags(tags(name))'

export async function buildPayload(itemType: ShareItemType, itemId: string): Promise<Record<string, unknown>> {
  const supa = supabase!
  if (itemType === 'prompt') {
    const { data, error } = await supa
      .from('image_prompts')
      .select('id, name, prompt, notes, updated_at, reference_asset_ids, use_reference_images, color_codes, project_ids')
      .eq('id', itemId)
      .single()
    if (error) throw error
    const d = data as {
      id: string
      name: string
      prompt: string
      notes: string
      updated_at?: string | null
      reference_asset_ids?: string[]
      use_reference_images?: boolean
      color_codes?: string[]
      project_ids?: string[]
    }
    // The cover images travel with the prompt — they ARE how the
    // recipient sees what this prompt produces.
    const refIds = d.reference_asset_ids ?? []
    let referenceAssets: SharePromptPayload['reference_assets'] = []
    if (refIds.length > 0) {
      const { data: rows } = await supa.from('assets').select('*').in('id', refIds)
      const byId = new Map(((rows ?? []) as Asset[]).map((a) => [a.id, a]))
      const projectIds = [...new Set(((rows ?? []) as Asset[]).map((a) => a.project_id))]
      const { data: projs } = await supa
        .from('projects')
        .select('id, name, slug, x_username')
        .in('id', projectIds)
      const projById = new Map(
        ((projs ?? []) as Array<{ id: string; name: string; slug: string; x_username: string | null }>).map((pr) => [pr.id, pr]),
      )
      referenceAssets = refIds
        .map((id) => byId.get(id))
        .filter((a): a is Asset => !!a)
        .map((a) => {
          const pr = projById.get(a.project_id)
          return {
            ...assetPayload(a),
            source_project_name: pr?.name ?? null,
            source_project_slug: pr?.slug ?? null,
            source_project_x_username: pr?.x_username ?? null,
          }
        })
    }
    // The project tags travel as descriptors (name/slug/handle); the
    // recipient re-matches them to their own projects on accept.
    const tagIds = d.project_ids ?? []
    let tagProjects: NonNullable<SharePromptPayload['projects']> = []
    if (tagIds.length > 0) {
      const { data: tagRows } = await supa
        .from('projects')
        .select('id, name, slug, x_username')
        .in('id', tagIds)
      const byId = new Map(
        ((tagRows ?? []) as Array<{ id: string; name: string; slug: string; x_username: string | null }>).map(
          (pr) => [pr.id, pr],
        ),
      )
      tagProjects = tagIds
        .map((id) => byId.get(id))
        .filter((pr): pr is NonNullable<typeof pr> => !!pr)
        .map((pr) => ({ name: pr.name, slug: pr.slug, x_username: pr.x_username }))
    }
    return {
      name: d.name,
      prompt: d.prompt,
      notes: d.notes,
      source_item_id: d.id,
      source_updated_at: d.updated_at ?? null,
      reference_assets: referenceAssets,
      use_reference_images: d.use_reference_images ?? false,
      color_codes: d.color_codes ?? [],
      projects: tagProjects,
    } as Record<string, unknown>
  }

  if (itemType === 'post') {
    const { data, error } = await supa
      .from('posts')
      .select(`${POST_SELECT}, projects(name, slug, x_username)`)
      .eq('id', itemId)
      .single()
    if (error) throw error
    const row = data as unknown as RawPostRow & {
      projects: { name: string; slug: string | null; x_username: string | null } | null
    }
    const media = await mediaForPosts([row])
    const payload = postPayload(row, media.get(row.id) ?? [], row.projects?.name)
    payload.project_slug = row.projects?.slug ?? null
    payload.project_x_username = row.projects?.x_username ?? null
    return payload as unknown as Record<string, unknown>
  }

  // project: ONLY the project shell — profile/brand + knowledge.
  // Posts and media never travel with a project share; posts are
  // shared individually (with their media) via a post share.
  const { data: project, error: pErr } = await supa
    .from('projects')
    .select(
      'name, slug, description, brand_voice, x_username, website_url, content_pillars, sample_posts, custom_instructions, official_links, logo_asset_id, updated_at',
    )
    .eq('id', itemId)
    .single()
  if (pErr) throw pErr

  // Logos are part of the project's identity — they travel with it.
  // (Posts and other media do not; posts are shared individually.)
  const { data: logoRows } = await supa
    .from('assets')
    .select('*')
    .eq('project_id', itemId)
    .in('kind', ['logo', 'logo_full', 'logo_icon', 'logo_transparent_name'])
  const logoAssets = new Map<string, ShareAssetPayload>()
  for (const row of (logoRows ?? []) as Asset[]) logoAssets.set(row.r2_key, assetPayload(row))
  let logoR2Key: string | null = null
  const primaryLogoId = (project as { logo_asset_id?: string | null }).logo_asset_id
  if (primaryLogoId) {
    const { data: primary } = await supa.from('assets').select('*').eq('id', primaryLogoId).maybeSingle()
    if (primary) {
      const a = assetPayload(primary as Asset)
      logoAssets.set(a.r2_key, a)
      logoR2Key = a.r2_key
    }
  }

  const { data: knowledge, error: kErr } = await supa
    .from('knowledge')
    .select('kind, title, content, url, notes')
    .eq('project_id', itemId)
    .order('created_at')
  if (kErr) throw kErr

  const payload: ShareProjectPayload = {
    project: {
      name: project.name as string,
      slug: project.slug as string,
      description: (project.description as string | null) ?? null,
      brand_voice: (project.brand_voice as Record<string, unknown>) ?? {},
      x_username: (project.x_username as string | null) ?? null,
      website_url: (project.website_url as string | null) ?? null,
      content_pillars: (project.content_pillars as string[]) ?? [],
      sample_posts: (project.sample_posts as string[]) ?? [],
      custom_instructions: (project.custom_instructions as string | null) ?? null,
      official_links: (project.official_links as unknown[]) ?? [],
      logos: [...logoAssets.values()],
      logo_r2_key: logoR2Key,
    },
    knowledge: (knowledge ?? []) as ShareProjectPayload['knowledge'],
    source_item_id: itemId,
    source_updated_at: ((project as { updated_at?: string | null }).updated_at ?? null) as string | null,
  }
  return payload as unknown as Record<string, unknown>
}

// ── queries ──────────────────────────────────────────────────────────────

const SHARE_SELECT = '*, sender:profiles!shares_sender_id_fkey(display_name, email), recipient:profiles!shares_recipient_id_fkey(display_name, email)'

export function useReceivedShares() {
  const { userId } = useCurrentUserId()
  return useQuery({
    queryKey: ['shares', 'received', userId],
    enabled: !!supabase && !!userId,
    queryFn: async (): Promise<Share[]> => {
      const { data, error } = await supabase!
        .from('shares')
        .select(SHARE_SELECT)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Share[]
    },
  })
}

export function useSentShares() {
  const { userId } = useCurrentUserId()
  return useQuery({
    queryKey: ['shares', 'sent', userId],
    enabled: !!supabase && !!userId,
    queryFn: async (): Promise<Share[]> => {
      const { data, error } = await supabase!
        .from('shares')
        .select(SHARE_SELECT)
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Share[]
    },
  })
}

export function usePendingShareCount() {
  const { userId } = useCurrentUserId()
  return useQuery({
    queryKey: ['shares', 'pending-count', userId],
    enabled: !!supabase && !!userId,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase!
        .from('shares')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('status', 'pending')
      if (error) return 0
      return count ?? 0
    },
  })
}

function useCurrentUserId() {
  const query = useQuery({
    queryKey: ['shares', 'me'],
    enabled: !!supabase,
    queryFn: async () => (await supabase!.auth.getUser()).data.user?.id ?? null,
  })
  return { userId: query.data ?? null }
}

// ── send ─────────────────────────────────────────────────────────────────

export function useSendShare() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      items: Array<{ itemType: ShareItemType; itemId: string; title: string }>
      recipientEmail: string
      message?: string
    }): Promise<void> => {
      const supa = supabase!
      if (input.items.length === 0) throw new Error('Pick at least one item to send.')
      const { data: me } = await supa.auth.getUser()
      if (!me.user) throw new Error('You are signed out.')

      const { data: found, error: lookupErr } = await supa.rpc('find_recipient_by_email', {
        p_email: input.recipientEmail.trim(),
      })
      if (lookupErr) throw lookupErr
      const recipient = (found as Array<{ id: string }> | null)?.[0]
      if (!recipient) {
        throw new Error(
          `No PostGen account found for ${input.recipientEmail.trim()}. They need to sign up first — then you can send to them.`,
        )
      }

      // One pending share per item, inserted together: the recipient can
      // accept or decline each project/post/prompt independently.
      const rows = []
      for (const item of input.items) {
        rows.push({
          sender_id: me.user.id,
          recipient_id: recipient.id,
          item_type: item.itemType,
          item_id: item.itemId,
          title: item.title,
          payload: await buildPayload(item.itemType, item.itemId),
          message: (input.message ?? '').trim(),
        })
      }
      // Re-sending an item replaces its still-pending earlier send, so
      // the recipient sees ONE (newest) share per item, never a pile.
      await supa
        .from('shares')
        .delete()
        .eq('sender_id', me.user.id)
        .eq('recipient_id', recipient.id)
        .eq('status', 'pending')
        .in('item_id', input.items.map((i) => i.itemId))
      const { error } = await supa.from('shares').insert(rows)
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      // Offer this email as a one-tap quick-select on future sends.
      rememberRecipient(vars.recipientEmail)
      void qc.invalidateQueries({ queryKey: ['shares'] })
    },
  })
}

// ── accept / import ──────────────────────────────────────────────────────

/** Create (or reuse) the recipient's own assets rows for shared media. */
async function importAssets(
  userId: string,
  projectId: string,
  assets: ShareAssetPayload[],
): Promise<Map<string, string>> {
  const byKey = new Map<string, string>()
  const unique = [...new Map(assets.map((a) => [a.r2_key, a])).values()]
  for (const a of unique) {
    const { data: existing } = await supabase!
      .from('assets')
      .select('id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .eq('r2_key', a.r2_key)
      .maybeSingle()
    if (existing) {
      byKey.set(a.r2_key, (existing as { id: string }).id)
      continue
    }
    const { data, error } = await supabase!
      .from('assets')
      .insert({ user_id: userId, project_id: projectId, ...a })
      .select('id')
      .single()
    if (error) throw error
    byKey.set(a.r2_key, (data as { id: string }).id)
  }
  return byKey
}

async function importPost(
  payload: SharePostPayload,
  projectId: string,
  assetIds: Map<string, string>,
  existing?: { id: string; status: PostStatus } | null,
): Promise<{ postId: string | null; skipped: boolean }> {
  const cleanedTweets = payload.tweets.map((t) => t.trim()).filter(Boolean)
  // Artwork captions are optional: keep one (possibly empty) anchor block
  // so the shared image still has a post_tweets row to attach to.
  const tweets = payload.type === 'artwork' ? [cleanedTweets[0] ?? ''] : cleanedTweets
  if (payload.type !== 'artwork' && tweets.length === 0) return { postId: null, skipped: true }

  let contentText = threadToContentText(tweets)
  if (payload.type === 'quote') {
    const extra = [String(payload.meta?.source ?? ''), String(payload.meta?.comment ?? '')]
      .filter(Boolean)
      .join('\n')
    if (extra) contentText = `${contentText}\n\n${extra}`
  }
  const contentHash = await sha256Hex(contentText)
  if (contentText) {
    if (existing) {
      // Updating a copy: the post may match ITSELF — exclude it from the
      // exact-duplicate check, but still refuse to clone another post.
      const { data: dup } = await supabase!.rpc('find_duplicate_post', {
        p_content_hash: contentHash,
        p_exclude_post_id: existing.id,
      })
      if (dup) return { postId: null, skipped: true }
    } else if (await findExactDuplicate(contentHash)) {
      return { postId: null, skipped: true }
    }
  }

  const counters: Record<number, number> = {}
  const p_media = payload.media
    .filter((m) => assetIds.has(m.asset.r2_key))
    .map((m) => {
      counters[m.tweet_index] = (counters[m.tweet_index] ?? 0) + 1
      return {
        tweet_position: m.tweet_index + 1,
        asset_id: assetIds.get(m.asset.r2_key)!,
        position: counters[m.tweet_index],
      }
    })

  const { data, error } = await supabase!.rpc('save_post_with_tweets', {
    p_post_id: existing?.id ?? null,
    p_project_id: projectId,
    p_category: payload.category,
    // An update refreshes the content but keeps the recipient's own
    // workflow status (a post they already approved/published must not
    // silently drop back to the sender's status).
    p_status: existing ? existing.status : payload.status,
    p_title: payload.title,
    p_content_text: contentText,
    p_content_hash: contentHash,
    p_tweets: tweets,
    p_tag_names: payload.tags,
    p_media,
    p_created_via: 'web',
    p_post_type: payload.type,
    p_meta: payload.meta ?? {},
  })
  if (error) throw error
  return { postId: data as string, skipped: false }
}

async function uniqueSlug(userId: string, base: string, name: string): Promise<string> {
  const stem = (base || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'
  const { data } = await supabase!.from('projects').select('slug').eq('user_id', userId)
  const taken = new Set((data ?? []).map((r) => (r as { slug: string }).slug))
  if (!taken.has(stem)) return stem
  let n = 2
  while (taken.has(`${stem}-${n}`)) n += 1
  return `${stem}-${n}`
}

// ── no-duplicate import mapping ─────────────────────────────────────────

export type ShareImport = {
  recipient_id: string
  sender_id: string
  item_type: ShareItemType
  source_item_id: string
  source_project_id: string | null
  local_id: string
  local_project_id: string | null
  source_updated_at: string | null
  last_share_id: string | null
}

/** All items the current user has ever imported, keyed for lookup. */
export function useShareImports() {
  const { userId } = useCurrentUserId()
  return useQuery({
    queryKey: ['share-imports', userId],
    enabled: !!supabase && !!userId,
    queryFn: async (): Promise<ShareImport[]> => {
      const { data, error } = await supabase!
        .from('share_imports')
        .select('*')
        .eq('recipient_id', userId)
      if (error) return []
      return (data ?? []) as ShareImport[]
    },
  })
}

async function getImport(
  userId: string,
  senderId: string,
  itemType: ShareItemType,
  sourceItemId: string,
): Promise<ShareImport | null> {
  const { data } = await supabase!
    .from('share_imports')
    .select('*')
    .eq('recipient_id', userId)
    .eq('sender_id', senderId)
    .eq('item_type', itemType)
    .eq('source_item_id', sourceItemId)
    .maybeSingle()
  return (data as ShareImport | null) ?? null
}

async function recordImport(
  userId: string,
  share: Share,
  local: { localId: string; localProjectId?: string | null; sourceProjectId?: string | null; sourceUpdatedAt?: string | null },
  override?: { itemType: ShareItemType; sourceItemId: string },
): Promise<void> {
  await supabase!.from('share_imports').upsert(
    {
      recipient_id: userId,
      sender_id: share.sender_id,
      item_type: override?.itemType ?? share.item_type,
      source_item_id: override?.sourceItemId ?? share.item_id,
      source_project_id: local.sourceProjectId ?? null,
      local_id: local.localId,
      local_project_id: local.localProjectId ?? null,
      source_updated_at: local.sourceUpdatedAt ?? share.created_at,
      last_share_id: share.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'recipient_id,sender_id,item_type,source_item_id' },
  )
}

/** The recipient's local project that already holds items from a source project. */
async function localProjectForSourceProject(
  userId: string,
  senderId: string,
  sourceProjectId: string,
): Promise<string | null> {
  const { data } = await supabase!
    .from('share_imports')
    .select('local_id, local_project_id')
    .eq('recipient_id', userId)
    .eq('sender_id', senderId)
    .or(`source_project_id.eq.${sourceProjectId},source_item_id.eq.${sourceProjectId}`)
    .limit(5)
  for (const r of (data ?? []) as Array<{ local_id: string; local_project_id: string | null }>) {
    const pid = r.local_project_id ?? r.local_id
    if (pid) return pid
  }
  return null
}

export type AcceptResult = {
  kind: ShareItemType
  /** true when an existing copy was updated instead of duplicated. */
  updated?: boolean
  projectId?: string
  postId?: string
  promptId?: string
  importedPosts?: number
  skippedPosts?: number
}

async function runAccept(share: Share, targetProjectId: string | null): Promise<AcceptResult> {
  const supa = supabase!
  const { data: me } = await supa.auth.getUser()
  const userId = me.user?.id
  if (!userId) throw new Error('You are signed out.')

  let result: AcceptResult

  if (share.item_type === 'prompt') {
    const p = share.payload as unknown as SharePromptPayload
    // Already have this prompt (from an earlier accept)? Update it.
    let existingId: string | null = null
    let existingProjects: string[] = []
    const imp = await getImport(userId, share.sender_id, 'prompt', share.item_id)
    if (imp) {
      const { data } = await supa.from('image_prompts').select('id, project_ids').eq('id', imp.local_id).maybeSingle()
      if (data) {
        existingId = (data as { id: string }).id
        existingProjects = (data as { project_ids: string[] }).project_ids ?? []
      }
    }
    if (!existingId) {
      // Copies imported before import-tracking existed: same name = same prompt.
      const { data } = await supa
        .from('image_prompts')
        .select('id, project_ids')
        .eq('user_id', userId)
        .eq('name', p.name)
        .limit(1)
      const hit = (data ?? [])[0] as { id: string; project_ids: string[] } | undefined
      if (hit) {
        existingId = hit.id
        existingProjects = hit.project_ids ?? []
      }
    }
    // The prompt's project tags travel too: resolve each source project
    // to the recipient's own matching project (handle → slug → name). If
    // they don't have that project yet, create a minimal shell so the
    // tag survives instead of silently vanishing.
    const tagIds: string[] = []
    for (const sp of p.projects ?? []) {
      let localId: string | null = null
      if (sp.x_username) {
        const { data } = await supa.from('projects').select('id').eq('user_id', userId).eq('x_username', sp.x_username).limit(1)
        localId = ((data ?? [])[0] as { id: string } | undefined)?.id ?? null
      }
      if (!localId && sp.slug) {
        const { data } = await supa.from('projects').select('id').eq('user_id', userId).eq('slug', sp.slug).limit(1)
        localId = ((data ?? [])[0] as { id: string } | undefined)?.id ?? null
      }
      if (!localId && sp.name) {
        const { data } = await supa.from('projects').select('id').eq('user_id', userId).eq('name', sp.name).limit(1)
        localId = ((data ?? [])[0] as { id: string } | undefined)?.id ?? null
      }
      if (!localId) {
        const slug = await uniqueSlug(userId, sp.slug || sp.name, sp.name)
        const { data, error: cErr } = await supa
          .from('projects')
          .insert({
            user_id: userId,
            name: sp.name,
            slug,
            x_username: sp.x_username || null,
            description: 'Created from a shared prompt’s project tag.',
          })
          .select('id')
          .single()
        if (cErr) throw cErr
        localId = (data as { id: string }).id
      }
      if (localId && !tagIds.includes(localId)) tagIds.push(localId)
    }

    // Covers travel with the prompt: recreate their asset rows in the
    // recipient's account and point the prompt at the local copies.
    // Home for them: the local project matching the cover's source
    // project (handle/slug), else the recipient's newest project, else
    // a small dedicated project so the images are never dropped.
    const covers = p.reference_assets ?? []
    let localRefIds: string[] | null = null
    if (covers.length > 0) {
      let homeId: string | null = null
      const first = covers[0]
      if (first.source_project_x_username) {
        const { data } = await supa.from('projects').select('id').eq('user_id', userId).eq('x_username', first.source_project_x_username).limit(1)
        homeId = ((data ?? [])[0] as { id: string } | undefined)?.id ?? null
      }
      if (!homeId && first.source_project_slug) {
        const { data } = await supa.from('projects').select('id').eq('user_id', userId).eq('slug', first.source_project_slug).limit(1)
        homeId = ((data ?? [])[0] as { id: string } | undefined)?.id ?? null
      }
      if (!homeId) {
        const { data } = await supa.from('projects').select('id').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
        homeId = ((data ?? [])[0] as { id: string } | undefined)?.id ?? null
      }
      if (!homeId) {
        const slug = await uniqueSlug(userId, 'prompt-covers', 'Prompt covers')
        const { data, error: cErr } = await supa
          .from('projects')
          .insert({ user_id: userId, name: 'Prompt covers', slug, description: 'Cover images for prompts shared with me.' })
          .select('id')
          .single()
        if (cErr) throw cErr
        homeId = (data as { id: string }).id
      }
      const byKey = await importAssets(
        userId,
        homeId,
        covers.map((c) => {
          const { source_project_name: _n, source_project_slug: _s, source_project_x_username: _x, ...a } = c
          void _n
          void _s
          void _x
          return a
        }),
      )
      localRefIds = covers.map((c) => byKey.get(c.r2_key)).filter((x): x is string => !!x)
    }

    if (existingId) {
      const { error } = await supa
        .from('image_prompts')
        .update({
          name: p.name,
          prompt: p.prompt,
          notes: p.notes ?? '',
          // Old payloads (pre-cover-sharing) don't replace existing refs.
          ...(localRefIds !== null
            ? {
                reference_asset_ids: localRefIds,
                use_reference_images: p.use_reference_images ?? false,
                color_codes: p.color_codes ?? [],
              }
            : {}),
          // Tags merge: shared tags are added, the recipient's own
          // existing tags on this prompt are never removed.
          project_ids: [...new Set([...existingProjects, ...tagIds])],
        })
        .eq('id', existingId)
      if (error) throw error
      await recordImport(userId, share, { localId: existingId, sourceUpdatedAt: p.source_updated_at })
      result = { kind: 'prompt', promptId: existingId, updated: true }
    } else {
      const { data, error } = await supa
        .from('image_prompts')
        .insert({
          user_id: userId,
          name: p.name,
          prompt: p.prompt,
          notes: p.notes ?? '',
          reference_asset_ids: localRefIds ?? [],
          project_ids: tagIds,
          use_reference_images: p.use_reference_images ?? false,
          color_codes: p.color_codes ?? [],
        })
        .select('id')
        .single()
      if (error) throw error
      const promptId = (data as { id: string }).id
      await recordImport(userId, share, { localId: promptId, sourceUpdatedAt: p.source_updated_at })
      result = { kind: 'prompt', promptId, updated: false }
    }
  } else if (share.item_type === 'post') {
    const p = share.payload as unknown as SharePostPayload
    const sourceProjectId = p.source_project_id ?? null

    // Already have this post? Find the copy (mapping first, title second).
    const imp = await getImport(userId, share.sender_id, 'post', share.item_id)
    let existingPost: { id: string; status: PostStatus } | null = null
    if (imp) {
      const { data } = await supa.from('posts').select('id, status').eq('id', imp.local_id).maybeSingle()
      if (data) existingPost = data as { id: string; status: PostStatus }
    }

    // Destination project: explicit choice → the project this post's copy
    // already lives in → the local project matching the SOURCE project
    // (one project per source project, never one per post) → a project
    // with the same name → only then create a new one.
    let projectId = targetProjectId
    if (!projectId && imp?.local_project_id) projectId = imp.local_project_id
    if (!projectId && sourceProjectId) {
      projectId = await localProjectForSourceProject(userId, share.sender_id, sourceProjectId)
    }
    // Same source project under a different door: a project the recipient
    // already has with this @handle or slug IS that project (per-user
    // slugs are unique). Older payloads only carry the name.
    if (!projectId && p.project_x_username) {
      const { data } = await supa.from('projects').select('id').eq('user_id', userId).eq('x_username', p.project_x_username).limit(1)
      projectId = ((data ?? [])[0] as { id: string } | undefined)?.id ?? null
    }
    if (!projectId && p.project_slug) {
      const { data } = await supa.from('projects').select('id').eq('user_id', userId).eq('slug', p.project_slug).limit(1)
      projectId = ((data ?? [])[0] as { id: string } | undefined)?.id ?? null
    }
    if (!projectId && p.project_name) {
      const { data } = await supa.from('projects').select('id').eq('user_id', userId).eq('name', p.project_name).limit(1)
      projectId = ((data ?? [])[0] as { id: string } | undefined)?.id ?? null
    }
    if (projectId) {
      // A mapped project may have been deleted since — don't aim at air.
      const { data } = await supa.from('projects').select('id').eq('id', projectId).eq('user_id', userId).maybeSingle()
      if (!data) projectId = null
    }
    if (!projectId) {
      const name = p.project_name || 'Shared posts'
      const slug = await uniqueSlug(userId, name, name)
      const { data, error } = await supa
        .from('projects')
        .insert({ user_id: userId, name, slug, description: 'Posts shared with me on PostGen.' })
        .select('id')
        .single()
      if (error) throw error
      projectId = (data as { id: string }).id
    }

    if (!existingPost && projectId) {
      const { data } = await supa
        .from('posts')
        .select('id, status')
        .eq('project_id', projectId)
        .eq('title', p.title)
        .limit(1)
      const hit = (data ?? [])[0] as { id: string; status: PostStatus } | undefined
      if (hit) existingPost = hit
    }

    // Link the source PROJECT to this local project too, so accepting
    // the project itself later updates this one instead of duplicating.
    if (sourceProjectId) {
      const link = await getImport(userId, share.sender_id, 'project', sourceProjectId)
      if (!link) {
        await recordImport(
          userId,
          share,
          { localId: projectId, localProjectId: projectId, sourceProjectId, sourceUpdatedAt: p.source_updated_at },
          { itemType: 'project', sourceItemId: sourceProjectId },
        )
      }
    }

    const assetIds = await importAssets(userId, projectId, p.media.map((m) => m.asset))
    const imported = await importPost(p, projectId, assetIds, existingPost)
    const localPostId = imported.postId ?? existingPost?.id
    if (localPostId) {
      await recordImport(userId, share, {
        localId: localPostId,
        localProjectId: projectId,
        sourceProjectId,
        sourceUpdatedAt: p.source_updated_at,
      })
    }
    result = {
      kind: 'post',
      projectId,
      postId: localPostId ?? undefined,
      skippedPosts: imported.skipped ? 1 : 0,
      updated: !!existingPost && !imported.skipped,
    }
  } else {
    const p = share.payload as unknown as ShareProjectPayload

    // Already have this project? Update it in place — posts inside the
    // recipient's copy are theirs and are never touched by an update.
    let projectId: string | null = null
    let updated = false
    const imp = await getImport(userId, share.sender_id, 'project', share.item_id)
    if (imp) {
      const { data } = await supa.from('projects').select('id').eq('id', imp.local_id).eq('user_id', userId).maybeSingle()
      if (data) projectId = (data as { id: string }).id
    }
    if (!projectId) {
      // Adopt an existing same-identity project instead of duplicating:
      // per-user slugs are unique, and @handles identify a project — so
      // a slug match OR a handle match is decisive. This also catches
      // the bare project a post-accept created earlier (it has the
      // slug but no @handle yet), and the recipient's own original.
      const { data } = await supa
        .from('projects')
        .select('id')
        .eq('user_id', userId)
        .eq('slug', p.project.slug)
        .limit(1)
      projectId = ((data ?? [])[0] as { id: string } | undefined)?.id ?? null
    }
    if (!projectId && p.project.x_username) {
      const { data } = await supa
        .from('projects')
        .select('id')
        .eq('user_id', userId)
        .eq('x_username', p.project.x_username)
        .limit(1)
      projectId = ((data ?? [])[0] as { id: string } | undefined)?.id ?? null
    }

    const fields = {
      name: p.project.name,
      description: p.project.description,
      brand_voice: p.project.brand_voice ?? {},
      x_username: p.project.x_username,
      website_url: p.project.website_url,
      content_pillars: p.project.content_pillars ?? [],
      sample_posts: p.project.sample_posts ?? [],
      custom_instructions: p.project.custom_instructions,
      official_links: p.project.official_links ?? [],
    }
    if (projectId) {
      const { error } = await supa.from('projects').update(fields).eq('id', projectId)
      if (error) throw error
      updated = true
      // Knowledge is replaced with the sender's latest snapshot.
      await supa.from('knowledge').delete().eq('project_id', projectId)
    } else {
      const slug = await uniqueSlug(userId, p.project.slug, p.project.name)
      const { data: created, error } = await supa
        .from('projects')
        .insert({ user_id: userId, slug, ...fields })
        .select('id')
        .single()
      if (error) throw error
      projectId = (created as { id: string }).id
    }

    // Logos travel with the project: recreate their asset rows here and
    // point the project's primary logo at the matching copy.
    const legacyLogo = (p.project as { logo?: ShareAssetPayload | null }).logo
    const logoPayloads: ShareAssetPayload[] =
      p.project.logos ?? (legacyLogo ? [legacyLogo] : [])
    if (logoPayloads.length > 0) {
      const logoIds = await importAssets(userId, projectId, logoPayloads)
      const primaryKey = p.project.logo_r2_key ?? legacyLogo?.r2_key ?? logoPayloads[0].r2_key
      const primaryId = logoIds.get(primaryKey)
      if (primaryId) {
        await supa.from('projects').update({ logo_asset_id: primaryId }).eq('id', projectId)
      }
    }

    if (p.knowledge?.length > 0) {
      const { error: kErr } = await supa.from('knowledge').insert(
        p.knowledge.map((k) => ({ user_id: userId, project_id: projectId, ...k })),
      )
      if (kErr) throw kErr
    }

    await recordImport(userId, share, {
      localId: projectId,
      localProjectId: projectId,
      sourceProjectId: share.item_id,
      sourceUpdatedAt: p.source_updated_at,
    })
    result = { kind: 'project', projectId, updated }
  }

  const { error: updErr } = await supa
    .from('shares')
    .update({ status: 'accepted', responded_at: new Date().toISOString(), result: { ...result } })
    .eq('id', share.id)
  if (updErr) throw updErr
  return result
}

export function useAcceptShare() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ share, targetProjectId }: { share: Share; targetProjectId?: string | null }) =>
      runAccept(share, targetProjectId ?? null),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['shares'] })
      void qc.invalidateQueries({ queryKey: ['share-imports'] })
      void qc.invalidateQueries({ queryKey: ['projects'] })
      void qc.invalidateQueries({ queryKey: ['posts'] })
      void qc.invalidateQueries({ queryKey: ['image-prompts'] })
      void qc.invalidateQueries({ queryKey: ['post-summaries'] })
    },
  })
}

export function useRespondShare() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ share, action }: { share: Share; action: 'declined' | 'cancelled' | 'delete' }) => {
      const supa = supabase!
      if (action === 'delete') {
        const { error } = await supa.from('shares').delete().eq('id', share.id)
        if (error) throw error
        return
      }
      const { error } = await supa
        .from('shares')
        .update({ status: action, responded_at: new Date().toISOString() })
        .eq('id', share.id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['shares'] }),
  })
}
