import { serviceClient } from './auth'
import type { Env } from './env'
import { sha256Hex, threadToContentText } from '../../src/lib/text'
import { blacklistHits } from '../../src/lib/blacklist'
import { signAsset } from './signing'

export class AgentError extends Error {
  status: number
  body: unknown
  constructor(status: number, body: unknown) {
    super(typeof body === 'object' && body !== null ? JSON.stringify(body) : String(body))
    this.status = status
    this.body = body
  }
}

export type CreatedVia = 'api' | 'mcp'
export type AgentAuth = { keyId: string; userId: string }

export const SIMILARITY_BLOCK = 0.65
export const SIMILARITY_SHOW = 0.45
export const DAILY_POST_CAP = 50

function db(env: Env) {
  return serviceClient(env)
}

function fail(error: { message: string } | null): never {
  throw new AgentError(500, { error: error?.message ?? 'database error' })
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'project'
  )
}

/** Hard block on the project's blacklist (words/symbols) — agent writes only. */
function assertBlacklist(brandVoice: unknown, text: string): void {
  const bv = (brandVoice ?? {}) as { blacklist?: string[]; tabooWords?: string[] }
  const hits = blacklistHits(text, bv.blacklist ?? bv.tabooWords ?? [])
  if (hits.length > 0) {
    throw new AgentError(403, {
      error: 'blacklisted',
      message: `Post contains blacklisted terms: ${hits.join(', ')}`,
      hits,
    })
  }
}

// ────────────────────────────── activity ──────────────────────────────

export async function logActivity(
  env: Env,
  auth: AgentAuth,
  action: string,
  target: { table?: string; id?: string },
  metadata?: unknown,
): Promise<void> {
  await db(env).from('agent_activity').insert({
    user_id: auth.userId,
    key_id: auth.keyId,
    action,
    target_table: target.table ?? null,
    target_id: target.id ?? null,
    metadata: metadata ?? null,
  })
}

// ────────────────────────────── projects ──────────────────────────────

export async function listProjects(env: Env, userId: string) {
  const { data, error } = await db(env)
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at')
  if (error) fail(error)
  return data
}

export async function getProject(env: Env, userId: string, id: string) {
  const client = db(env)
  const { data: project, error } = await client
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) fail(error)
  if (!project) throw new AgentError(404, { error: 'project not found' })

  const { data: knowledge, error: kErr } = await client
    .from('knowledge')
    .select('*')
    .eq('project_id', id)
    .eq('user_id', userId)
    .order('created_at')
  if (kErr) fail(kErr)

  return { ...project, knowledge: knowledge ?? [] }
}

export type ProjectWrite = {
  name?: string
  description?: string
  brand_voice?: unknown
  x_username?: string
  website_url?: string
  content_pillars?: string[]
  sample_posts?: string[]
  custom_instructions?: string
  official_links?: unknown
}

function projectProfileFields(input: ProjectWrite): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  if (input.x_username !== undefined) fields.x_username = input.x_username.trim().replace(/^@/, '') || null
  if (input.website_url !== undefined) fields.website_url = input.website_url.trim() || null
  if (input.content_pillars !== undefined) fields.content_pillars = input.content_pillars.map((c) => c.trim()).filter(Boolean)
  if (input.sample_posts !== undefined) fields.sample_posts = input.sample_posts.map((c) => c.trim()).filter(Boolean)
  if (input.custom_instructions !== undefined) fields.custom_instructions = input.custom_instructions.trim() || null
  if (input.official_links !== undefined) fields.official_links = input.official_links ?? []
  return fields
}

export async function createProject(
  env: Env,
  userId: string,
  input: ProjectWrite,
) {
  const name = (input.name ?? '').trim()
  if (!name) throw new AgentError(400, { error: 'name is required' })

  const base = slugify(name)
  const insert = (slug: string) =>
    db(env)
      .from('projects')
      .insert({
        user_id: userId,
        name,
        slug,
        description: input.description?.trim() || null,
        brand_voice: input.brand_voice ?? {},
        ...projectProfileFields(input),
      })
      .select()
      .single()

  let { data, error } = await insert(base)
  if (error && error.code === '23505') {
    ;({ data, error } = await insert(`${base}-${Date.now().toString(36).slice(-4)}`))
  }
  if (error) fail(error)
  return data
}

export async function updateProject(
  env: Env,
  userId: string,
  id: string,
  patch: ProjectWrite,
) {
  const updates: Record<string, unknown> = {}
  if (patch.name !== undefined) updates.name = patch.name.trim()
  if (patch.description !== undefined) updates.description = patch.description.trim() || null
  if (patch.brand_voice !== undefined) updates.brand_voice = patch.brand_voice
  Object.assign(updates, projectProfileFields(patch))

  const { data, error } = await db(env)
    .from('projects')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .maybeSingle()
  if (error) fail(error)
  if (!data) throw new AgentError(404, { error: 'project not found' })
  return data
}

// ─────────────────────────────── posts ───────────────────────────────

export type PostType = 'post' | 'thread' | 'article' | 'artwork' | 'quote'

const POST_TYPES: PostType[] = ['post', 'thread', 'article', 'artwork', 'quote']

export type PostWrite = {
  projectId?: string
  title?: string
  category?: 'promotional' | 'educational' | 'announcement' | 'other'
  type?: PostType
  status?: 'idea' | 'draft'
  tweets: string[]
  tagNames?: string[]
  /** Type-specific extras — quote: { source, comment }. */
  meta?: Record<string, unknown>
  /** Images to attach: [{ asset_id, tweet_position }] (tweet_position defaults to 1). */
  media?: Array<{ asset_id: string; tweet_position?: number }>
  allowSimilar?: boolean
}

function assertPostType(type: unknown): PostType {
  if (type === undefined) return 'post'
  if (typeof type !== 'string' || !POST_TYPES.includes(type as PostType)) {
    throw new AgentError(400, {
      error: 'invalid_type',
      message: `type must be one of: ${POST_TYPES.join(', ')}`,
    })
  }
  return type as PostType
}

/** Extra text that must count toward the no-repeat check (quote source + take). */
function metaText(meta?: Record<string, unknown>): string {
  if (!meta) return ''
  return [String(meta.source ?? ''), String(meta.comment ?? '')].filter(Boolean).join('\n')
}

function assertDraftsOnly(status?: string): 'idea' | 'draft' {
  if (status === undefined) return 'draft'
  if (status !== 'idea' && status !== 'draft') {
    throw new AgentError(403, {
      error: 'agents_drafts_only',
      message: 'Agents can only create/update drafts (status: idea | draft). A human approves/publishes in the web app.',
    })
  }
  return status
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validates the caller's media list and shapes it for p_media.
 * `position` is the order of the image *within* its tweet (1-based).
 */
function assertMedia(media: unknown): Array<{ tweet_position: number; asset_id: string; position: number }> {
  if (media === undefined || media === null) return []
  if (!Array.isArray(media)) {
    throw new AgentError(400, { error: 'media must be an array of { asset_id, tweet_position }' })
  }
  const seen = new Map<number, number>()
  return media.map((raw) => {
    const m = (raw ?? {}) as Record<string, unknown>
    const assetId = String(m.asset_id ?? '')
    if (!UUID_RE.test(assetId)) {
      throw new AgentError(400, { error: 'media[].asset_id must be a uuid' })
    }
    const pos = m.tweet_position === undefined || m.tweet_position === null ? 1 : Number(m.tweet_position)
    if (!Number.isInteger(pos) || pos < 1) {
      throw new AgentError(400, { error: 'media[].tweet_position must be an integer >= 1' })
    }
    const n = (seen.get(pos) ?? 0) + 1
    seen.set(pos, n)
    return { tweet_position: pos, asset_id: assetId, position: n }
  })
}

/** Every referenced asset must exist and belong to this user. */
async function assertOwnedAssets(env: Env, userId: string, media: Array<{ asset_id: string }>) {
  if (media.length === 0) return
  const ids = [...new Set(media.map((m) => m.asset_id))]
  const { data, error } = await db(env).from('assets').select('id').eq('user_id', userId).in('id', ids)
  if (error) fail(error)
  const owned = new Set((data ?? []).map((r: { id: string }) => r.id))
  const missing = ids.filter((id) => !owned.has(id))
  if (missing.length > 0) {
    throw new AgentError(400, { error: 'unknown asset_id', message: `not your assets: ${missing.join(', ')}` })
  }
}

function assertTweets(tweets: unknown): string[] {
  if (!Array.isArray(tweets) || tweets.length === 0) {
    throw new AgentError(400, { error: 'tweets must be a non-empty array of strings' })
  }
  return tweets.map((t) => String(t).trim()).filter(Boolean)
}

/** Runs the no-repeat check; throws 409 unless allowSimilar. */
async function assertNoRepeat(
  env: Env,
  userId: string,
  tweets: string[],
  opts: { excludePostId?: string; projectId?: string; allowSimilar?: boolean; extraText?: string },
): Promise<{ contentText: string; contentHash: string }> {
  const base = threadToContentText(tweets)
  const contentText = opts.extraText?.trim() ? `${base}\n\n${opts.extraText.trim()}` : base
  const contentHash = await sha256Hex(contentText)
  const client = db(env)

  const { data: dup, error: dupErr } = await client.rpc('find_duplicate_post', {
    p_content_hash: contentHash,
    p_user_id: userId,
    p_exclude_post_id: opts.excludePostId ?? null,
  })
  if (dupErr) fail(dupErr)

  const { data: similar, error: simErr } = await client.rpc('find_similar_posts', {
    p_content_text: contentText,
    p_exclude_post_id: opts.excludePostId ?? null,
    p_project_id: opts.projectId ?? null,
    p_threshold: SIMILARITY_SHOW,
    p_user_id: userId,
  })
  if (simErr) fail(simErr)

  const dupId = (dup as string | null) ?? null
  const simList = (similar ?? []) as Array<{
    id: string
    title: string
    project_id: string
    similarity: number
  }>
  const blocking = simList.filter((s) => s.similarity >= SIMILARITY_BLOCK)

  if (!opts.allowSimilar && (dupId || blocking.length > 0)) {
    throw new AgentError(409, {
      error: dupId ? 'duplicate' : 'similar',
      duplicate_of: dupId,
      similar: simList,
      message:
        'No-repeat guard: this content matches an existing post. Retry with "allow_similar": true only if an intentional variant.',
    })
  }

  return { contentText, contentHash }
}

async function assertDailyCap(env: Env, userId: string): Promise<void> {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const { count, error } = await db(env)
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('created_via', ['api', 'mcp'])
    .gte('created_at', today.toISOString())
  if (error) fail(error)
  if ((count ?? 0) >= DAILY_POST_CAP) {
    throw new AgentError(429, {
      error: 'daily_post_cap',
      message: `Agent post limit reached (${DAILY_POST_CAP}/day per user).`,
    })
  }
}

export async function listPosts(
  env: Env,
  userId: string,
  filters: { projectId?: string; status?: string; type?: string },
) {
  let q = db(env)
    .from('posts')
    .select('id, project_id, post_type, category, status, title, created_via, content_text, meta, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(100)
  if (filters.projectId) q = q.eq('project_id', filters.projectId)
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.type) q = q.eq('post_type', filters.type)
  const { data, error } = await q
  if (error) fail(error)
  return data
}

export async function getPost(env: Env, userId: string, id: string) {
  const client = db(env)
  const { data: post, error } = await client
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) fail(error)
  if (!post) throw new AgentError(404, { error: 'post not found' })

  const { data: tweets, error: tErr } = await client
    .from('post_tweets')
    .select('id, position, content')
    .eq('post_id', id)
    .order('position')
  if (tErr) fail(tErr)

  const tweetIds = (tweets ?? []).map((t: { id: string }) => t.id)
  let media: unknown[] = []
  if (tweetIds.length > 0) {
    const { data: mediaRows, error: mErr } = await client
      .from('post_media')
      .select('post_tweet_id, position, assets(id, r2_key, filename, mime_type)')
      .in('post_tweet_id', tweetIds)
      .order('position')
    if (mErr) fail(mErr)
    media = (mediaRows ?? []).map((r: Record<string, unknown>) => ({
      tweet_position: (tweets ?? []).findIndex((t: { id: string }) => t.id === r.post_tweet_id) + 1,
      position: r.position,
      asset: r.assets,
    }))
  }

  return { ...post, tweets: (tweets ?? []).map((t: { content: string }) => t.content), media }
}

export async function createDraft(
  env: Env,
  auth: AgentAuth,
  via: CreatedVia,
  input: PostWrite,
) {
  const status = assertDraftsOnly(input.status)
  const type = assertPostType(input.type)
  const tweets = assertTweets(input.tweets)
  if (!input.projectId) throw new AgentError(400, { error: 'project_id is required' })

  const media = assertMedia(input.media)
  await assertOwnedAssets(env, auth.userId, media)

  const client = db(env)
  const { data: project } = await client
    .from('projects')
    .select('id, brand_voice')
    .eq('id', input.projectId)
    .eq('user_id', auth.userId)
    .maybeSingle()
  if (!project) throw new AgentError(404, { error: 'project not found' })

  assertBlacklist(project.brand_voice, [input.title ?? '', ...tweets, metaText(input.meta)].join('\n'))
  await assertDailyCap(env, auth.userId)
  const { contentText, contentHash } = await assertNoRepeat(env, auth.userId, tweets, {
    projectId: input.projectId,
    allowSimilar: input.allowSimilar,
    extraText: metaText(input.meta),
  })

  const { data: postId, error } = await client.rpc('save_post_with_tweets', {
    p_post_id: null,
    p_project_id: input.projectId,
    p_category: input.category ?? 'other',
    p_status: status,
    p_title: input.title ?? '',
    p_content_text: contentText,
    p_content_hash: contentHash,
    p_tweets: tweets,
    p_tag_names: input.tagNames ?? [],
    p_media: media,
    p_created_via: via,
    p_post_type: type,
    p_meta: input.meta ?? {},
    p_user_id: auth.userId,
  })
  if (error) fail(error)

  await logActivity(env, auth, 'post.create', { table: 'posts', id: postId as string }, { via, title: input.title ?? '' })
  return getPost(env, auth.userId, postId as string)
}

export async function updateDraft(
  env: Env,
  auth: AgentAuth,
  via: CreatedVia,
  id: string,
  patch: Partial<PostWrite>,
) {
  const existing = await getPost(env, auth.userId, id)
  const status = assertDraftsOnly(patch.status)
  // a patch that omits `type` must keep the post's current type — otherwise
  // append_to_thread (which only sends tweets) silently turned every
  // article/artwork/quote into a plain post.
  const type = assertPostType(patch.type ?? (existing as { post_type?: string }).post_type ?? 'post')
  const tweets = patch.tweets ? assertTweets(patch.tweets) : (existing.tweets as string[])
  const meta = patch.meta ?? ((existing.meta ?? {}) as Record<string, unknown>)
  const media = assertMedia(patch.media)
  await assertOwnedAssets(env, auth.userId, media)

  const { data: projectRow } = await db(env)
    .from('projects')
    .select('brand_voice')
    .eq('id', existing.project_id)
    .maybeSingle()
  assertBlacklist(projectRow?.brand_voice, [patch.title ?? existing.title, ...tweets, metaText(meta)].join('\n'))

  const { contentText, contentHash } = await assertNoRepeat(env, auth.userId, tweets, {
    excludePostId: id,
    projectId: patch.projectId ?? existing.project_id,
    allowSimilar: patch.allowSimilar,
    extraText: metaText(meta),
  })

  const { error } = await db(env).rpc('save_post_with_tweets', {
    p_post_id: id,
    p_project_id: existing.project_id,
    p_category: patch.category ?? existing.category,
    p_status: status,
    p_title: patch.title ?? existing.title,
    p_content_text: contentText,
    p_content_hash: contentHash,
    p_tweets: tweets,
    p_tag_names: patch.tagNames ?? [],
    p_media: media,
    p_created_via: via,
    p_post_type: type,
    p_meta: meta,
    p_user_id: auth.userId,
  })
  if (error) fail(error)

  await logActivity(env, auth, 'post.update', { table: 'posts', id }, { via })
  return getPost(env, auth.userId, id)
}

export async function appendThread(
  env: Env,
  auth: AgentAuth,
  via: CreatedVia,
  id: string,
  newTweets: string[],
  opts: { allowSimilar?: boolean } = {},
) {
  const existing = await getPost(env, auth.userId, id)
  const add = assertTweets(newTweets)
  return updateDraft(env, auth, via, id, {
    tweets: [...(existing.tweets as string[]), ...add],
    allowSimilar: opts.allowSimilar,
  })
}

// ────────────────────────────── knowledge ──────────────────────────────

export async function addKnowledge(
  env: Env,
  auth: AgentAuth,
  input: {
    projectId?: string
    kind?: 'knowledge' | 'source'
    title?: string
    content?: string
    url?: string
    notes?: string
  },
) {
  if (!input.projectId) throw new AgentError(400, { error: 'project_id is required' })
  const title = (input.title ?? '').trim()
  if (!title) throw new AgentError(400, { error: 'title is required' })

  const { data, error } = await db(env)
    .from('knowledge')
    .insert({
      user_id: auth.userId,
      project_id: input.projectId,
      kind: input.kind ?? (input.url ? 'source' : 'knowledge'),
      title,
      content: input.content ?? null,
      url: input.url ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()
  if (error) fail(error)

  await logActivity(env, auth, 'knowledge.create', { table: 'knowledge', id: data.id }, { title })
  return data
}

// ─────────────────────────────── helpers ───────────────────────────────

export async function findSimilar(
  env: Env,
  userId: string,
  text: string,
  opts: { projectId?: string } = {},
) {
  const client = db(env)
  const { data, error } = await client.rpc('find_similar_posts', {
    p_content_text: threadToContentText([text]),
    p_exclude_post_id: null,
    p_project_id: opts.projectId ?? null,
    p_threshold: SIMILARITY_SHOW,
    p_user_id: userId,
  })
  if (error) fail(error)
  return { similar: (data ?? []) as Array<{ id: string; title: string; project_id: string; similarity: number }> }
}

// ────────────────────────────── assets ──────────────────────────────

/**
 * Short-lived signed URL for an R2 key. Absolute, because the caller is
 * often an external agent with no page origin to resolve a relative path
 * against. Falls back to null if media signing isn't configured.
 */
async function signedUrl(env: Env, key: string, origin: string): Promise<string | null> {
  try {
    const exp = Math.floor(Date.now() / 1000) + 900 // 15 min
    const sig = await signAsset(key, exp, env)
    return `${origin}/api/media/${key}?exp=${exp}&sig=${sig}`
  } catch {
    return null
  }
}

export type AssetSummary = {
  id: string
  project_id: string
  filename: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  alt_text: string | null
  kind: string
  created_at: string
  url: string | null
}

/**
 * Lists the user's media, optionally for one project.
 * Each asset comes back with a signed URL so the caller can actually
 * fetch and look at the image — an opaque UUID is useless for choosing art.
 */
export async function listAssets(
  env: Env,
  userId: string,
  filters: { projectId?: string; origin: string },
): Promise<AssetSummary[]> {
  let q = db(env)
    .from('assets')
    .select('id, project_id, filename, mime_type, size_bytes, width, height, alt_text, kind, r2_key, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (filters.projectId) q = q.eq('project_id', filters.projectId)
  const { data, error } = await q
  if (error) fail(error)
  const rows = (data ?? []) as Array<Omit<AssetSummary, 'url'> & { r2_key: string }>
  return Promise.all(
    rows.map(async ({ r2_key, ...rest }) => ({ ...rest, url: await signedUrl(env, r2_key, filters.origin) })),
  )
}

// ────────────────────────── image prompts ──────────────────────────

export type ImagePromptRow = {
  id: string
  name: string
  prompt: string
  notes: string
  reference_asset_ids: string[]
  created_at: string
  updated_at: string
}

export type ImagePromptWithRefs = ImagePromptRow & { reference_assets: AssetSummary[] }

/**
 * Saved image prompts with their reference images resolved.
 * References are the point: the prompt says what to make, the images
 * show what it should look like, so both travel together.
 */
export async function listImagePrompts(
  env: Env,
  userId: string,
  origin: string,
): Promise<ImagePromptWithRefs[]> {
  const { data, error } = await db(env)
    .from('image_prompts')
    .select('id, name, prompt, notes, reference_asset_ids, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  // PGRST205 = table not in the schema cache yet (migration not applied).
  // Answer with an empty library rather than failing the agent's whole turn.
  if (error) {
    if (error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message)) return []
    fail(error)
  }
  const prompts = (data ?? []) as ImagePromptRow[]

  // one pass over the union of referenced ids keeps this to two queries
  const wanted = [...new Set(prompts.flatMap((p) => p.reference_asset_ids ?? []))]
  let byId = new Map<string, AssetSummary>()
  if (wanted.length > 0) {
    const { data: assets, error: aErr } = await db(env)
      .from('assets')
      .select('id, project_id, filename, mime_type, size_bytes, width, height, alt_text, kind, r2_key, created_at')
      .eq('user_id', userId)
      .in('id', wanted)
    if (aErr) fail(aErr)
    const rows = (assets ?? []) as Array<Omit<AssetSummary, 'url'> & { r2_key: string }>
    byId = new Map(
      await Promise.all(
        rows.map(async (row) => {
          const { r2_key, ...rest } = row
          return [row.id, { ...rest, url: await signedUrl(env, r2_key, origin) }] as const
        }),
      ),
    )
  }

  return prompts.map((p) => ({
    ...p,
    // keep the stored order, and drop anything deleted since
    reference_assets: (p.reference_asset_ids ?? [])
      .map((id) => byId.get(id))
      .filter((a): a is AssetSummary => !!a),
  }))
}
