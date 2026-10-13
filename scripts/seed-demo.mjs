/**
 * Seeds the demo project ("Nova Protocol") used as the visual fixture while
 * rebuilding the UI: full brand profile, logo + mascot assets, and three
 * example posts in different states (draft thread / approved / published).
 *
 * Re-runnable: deletes an existing "Nova Protocol" owned by the test user first.
 *
 * Env (same contract as scripts/e2e.mjs):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, BASE_URL, E2E_EMAIL, E2E_PASSWORD
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ws from 'ws'

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? ''
const BASE_URL = (process.env.BASE_URL ?? 'https://postgen.pages.dev').replace(/\/$/, '')
const EMAIL = process.env.E2E_EMAIL ?? 'agent@postgen.com'
const PASSWORD = process.env.E2E_PASSWORD ?? ''
const ASSETS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'demo-assets')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !PASSWORD) {
  console.error('usage: SUPABASE_URL=… SUPABASE_ANON_KEY=… E2E_PASSWORD=… [BASE_URL=…] node scripts/seed-demo.mjs')
  process.exit(1)
}

const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { realtime: { transport: ws } })
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim()

const { data: auth, error: authErr } = await supa.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
if (authErr) {
  console.error('sign-in failed:', authErr.message)
  process.exit(1)
}
const uid = auth.user.id
const authHeader = { Authorization: `Bearer ${auth.session.access_token}` }
console.log(`signed in as ${EMAIL}`)

// ── clean previous demo project ──────────────────────────────────────────
const { data: olds, error: oldErr } = await supa
  .from('projects')
  .select('id')
  .eq('user_id', uid)
  .eq('name', 'Nova Protocol')
if (oldErr) throw new Error(`cleanup select: ${oldErr.message}`)
for (const old of olds ?? []) {
  const { data: oldAssets, error: assetErr } = await supa
    .from('assets')
    .select('r2_key')
    .eq('project_id', old.id)
  if (assetErr) throw new Error(`cleanup assets: ${assetErr.message}`)
  for (const a of oldAssets ?? []) {
    await fetch(`${BASE_URL}/api/media/delete`, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: a.r2_key }),
    }).catch(() => undefined)
  }
  const { error: delErr } = await supa.from('projects').delete().eq('id', old.id)
  if (delErr) throw new Error(`cleanup delete: ${delErr.message}`)
}
console.log(`cleared ${olds?.length ?? 0} previous demo project(s)`)

// ── project + brand profile ─────────────────────────────────────────────
const { data: project, error: projErr } = await supa
  .from('projects')
  .insert({
    user_id: uid,
    name: 'Nova Protocol',
    slug: 'nova-protocol',
    description:
      'Nova is an overcollateralized lending protocol on Base. Suppliers earn yield from ' +
      'isolated markets; borrowers draw against LP and staked assets. Currently in mainnet ' +
      'beta with two audits published and a risk dashboard v2 shipping this month.',
    x_username: 'novaprotocol',
    website_url: 'https://novaprotocol.xyz',
    brand_voice: {
      tone: 'confident and technical but friendly — explains mechanics simply, dry humor welcome, never hype-y',
      blacklist: ['guaranteed', 'risk-free', 'wagmi', 'moon', '🚀'],
    },
    content_pillars: ['product updates', 'education', 'ecosystem', 'community'],
    sample_posts: [
      'Big week: the audit is public, the docs are new, and the app is 2x faster. Here is the thread. 1/4',
      'If you remember one thing about lending markets: utilization drives rates. When demand spikes, so does the cost of borrowing — and that is the protocol working, not breaking.',
    ],
    custom_instructions:
      'Always link official contracts from the project profile. Mention audits when discussing security. ' +
      'Never comment on token price or promise returns.',
    official_links: [
      { label: 'Website', url: 'https://novaprotocol.xyz' },
      { label: 'Discord', url: 'https://discord.gg/novademo' },
      { label: 'GitHub', url: 'https://github.com/novaprotocol-demo' },
    ],
  })
  .select()
  .single()
if (projErr) {
  console.error('project insert failed:', projErr.message)
  process.exit(1)
}
console.log('project:', project.id)

// ── logo + mascot assets ────────────────────────────────────────────────
async function uploadAsset(filename, kind, alt) {
  const bytes = readFileSync(join(ASSETS_DIR, filename))
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: 'image/png' }), filename)
  form.append('project_id', project.id)
  form.append('alt_text', alt)
  const res = await fetch(`${BASE_URL}/api/media/upload`, { method: 'POST', headers: authHeader, body: form })
  const body = await res.json()
  if (!res.ok || !body.asset) throw new Error(`upload ${filename} failed: ${JSON.stringify(body)}`)
  await supa.from('assets').update({ kind }).eq('id', body.asset.id)
  return body.asset
}

const logo = await uploadAsset('logo.png', 'logo', 'Nova Protocol logo')
const mascot = await uploadAsset('mascot.png', 'mascot', 'Nova the mascot')
await supa.from('projects').update({ logo_asset_id: logo.id }).eq('id', project.id)
console.log('assets:', logo.id, mascot.id, '→ logo set')

// ── example posts ───────────────────────────────────────────────────────
async function savePost({ title, category, status, tweets, tagNames, media = [] }) {
  const contentText = norm(tweets.join('\n'))
  const { data: postId, error } = await supa.rpc('save_post_with_tweets', {
    p_post_id: null,
    p_project_id: project.id,
    p_category: category,
    p_status: status,
    p_title: title,
    p_content_text: contentText,
    p_content_hash: '', // demo fixture; no-repeat gate lives above the RPC
    p_tweets: tweets,
    p_tag_names: tagNames,
    p_media: media,
    p_created_via: 'web',
    p_user_id: uid,
  })
  if (error) throw new Error(`save_post_with_tweets (${title}): ${error.message}`)
  console.log(`post [${status}]:`, title, '→', postId)
  return postId
}

await savePost({
  title: 'Mainnet beta is live',
  category: 'announcement',
  status: 'draft',
  tagNames: ['product', 'mainnet'],
  tweets: [
    'Nova mainnet beta is live on Base. Supply USDC, borrow against your LP positions, and keep your yield working. novaprotocol.xyz',
    "What's new in beta: isolated markets for long-tail assets, a redesigned risk dashboard, and gasless approvals for first-time suppliers.",
    "We'll be shipping fixes daily this week. Feedback goes to Discord — the loudest bugs get fixed first.",
  ],
})

await savePost({
  title: 'How overcollateralized lending works',
  category: 'educational',
  status: 'approved',
  tagNames: ['education'],
  tweets: [
    'How overcollateralized lending works, in one breath: you deposit more than you borrow, the protocol prices risk in real time, and if your collateral sags below the line, positions unwind automatically. No credit checks. No trust required — just math.',
  ],
})

await savePost({
  title: 'Meet Nova, the mascot',
  category: 'promotional',
  status: 'published',
  tagNames: ['community'],
  tweets: [
    'Meet Nova — the face of every tutorial we ship from here on. Say hi. (She does not comment on token prices.)',
    'First tutorial with Nova lands Thursday: supplying your first position in under two minutes.',
  ],
  media: [{ asset_id: mascot.id, tweet_position: 1, position: 1 }],
})

const [{ count: postCount }, { count: assetCount }] = await Promise.all([
  supa.from('posts').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
  supa.from('assets').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
])
console.log(`\n✅ demo ready — project ${project.id}, ${postCount} posts, ${assetCount} assets`)
