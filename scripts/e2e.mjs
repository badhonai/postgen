#!/usr/bin/env node
/**
 * PostGen A→Z end-to-end check. Run against any deployment:
 *
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_ANON_KEY=eyJ… \
 *   BASE_URL=https://postgen.pages.dev \
 *   node scripts/e2e.mjs
 *
 * Exercises: auth → projects → posts/threads → no-repeat (SQL + agent API) →
 * drafts-only guard → API keys → MCP (initialize/tools/resources) → media
 * upload/sign/serve/delete → key revocation. Creates one throwaway test user
 * and cleans up its rows at the end.
 */

import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'node:crypto'
import ws from 'ws'

const BASE_URL = process.env.BASE_URL ?? 'https://postgen.pages.dev'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY (both are public client config).')
  process.exit(2)
}

let passed = 0
let failed = 0
const failures = []

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`)
  } else {
    failed += 1
    failures.push(name)
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`)
  }
  return ok
}

const sha256hex = (s) => createHash('sha256').update(s, 'utf8').digest('hex')
const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' <url> ')
    .replace(/^\s*\d+\s*\/\s*\d+\s*/gmu, '')
    .replace(/\s+/g, ' ')
    .trim()

function makeApiKey() {
  const prefix = randomBytes(4).toString('hex')
  const secret = randomBytes(32).toString('base64url')
  const key = `pgk_live_${prefix}_${secret}`
  return { key, prefix, hash: sha256hex(key) }
}

const api = (path, opts = {}) =>
  fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'content-type': 'application/json', ...(opts.headers ?? {}) },
  })

async function main() {
  const email = process.env.E2E_EMAIL ?? `e2e-${Date.now()}@example.com`
  const password = process.env.E2E_PASSWORD ?? `E2e-${randomBytes(9).toString('base64url')}`
  const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Node < 22 has no native WebSocket (only needed by realtime, unused here)
    realtime: { transport: ws },
  })

  console.log(`\nPostGen E2E — ${BASE_URL}\n${'═'.repeat(50)}`)

  // ── 1. AUTH ──────────────────────────────────────────────
  console.log('\n▸ Auth')
  let session = null
  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
    const { data: signIn, error: signInErr } = await supa.auth.signInWithPassword({
      email,
      password,
    })
    session = signIn.session
    if (signInErr) check('sign in (whitelisted account)', false, signInErr.message)
  } else {
    const { data: signUp, error: signUpErr } = await supa.auth.signUp({ email, password })
    if (signUpErr) check('sign up', false, signUpErr.message)
    session = signUp.session
    if (!session) {
      const { data: signIn, error: signInErr } = await supa.auth.signInWithPassword({
        email,
        password,
      })
      session = signIn.session
      if (signInErr) {
        check('sign up / sign in', false, signInErr.message)
        console.log('\n  ⛔ Cannot continue without a session.')
        console.log('     Whitelist-only setup? Create a user in Supabase → Authentication →')
        console.log('     Users → Add user (Auto Confirm ON), then run with:')
        console.log('       E2E_EMAIL=… E2E_PASSWORD=… node scripts/e2e.mjs')
        console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`)
        process.exit(1)
      }
    }
  }
  if (session) check('session JWT', true, email)
  const authHeader = { Authorization: `Bearer ${session.access_token}` }

  // clean leftovers from previously crashed runs (only rows this script created)
  const { data: leftovers } = await supa
    .from('projects')
    .select('id')
    .eq('name', 'E2E Project')
    .like('slug', 'e2e-%')
  for (const l of leftovers ?? []) {
    const { data: oldAssets } = await supa.from('assets').select('r2_key').eq('project_id', l.id)
    for (const a of oldAssets ?? []) {
      await api('/api/media/delete', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ key: a.r2_key }),
      }).catch(() => undefined)
    }
    await supa.from('projects').delete().eq('id', l.id)
  }

  // ── 2. WEB PATH: project + save RPC + SQL no-repeat ──────
  console.log('\n▸ Web path (supabase-js + RLS)')
  const { data: project, error: projErr } = await supa
    .from('projects')
    .insert({
      user_id: session.user.id,
      name: 'E2E Project',
      slug: `e2e-${Date.now().toString(36)}`,
      x_username: 'e2eweb',
      website_url: 'https://example.com',
      content_pillars: ['testing'],
      sample_posts: ['A sample post the AI should learn from.'],
      custom_instructions: 'Always verify facts.',
      official_links: [{ label: 'Site', url: 'https://example.com' }],
    })
    .select()
    .single()
  if (!check('create project (RLS insert)', !projErr && !!project, projErr?.message)) {
    throw new Error('cannot continue')
  }

  const tweets = ['Hello from the E2E runner — alpha bravo charlie delta.']
  const contentText = normalize(tweets.join('\n'))
  const contentHash = sha256hex(contentText)

  const { data: postId, error: saveErr } = await supa.rpc('save_post_with_tweets', {
    p_post_id: null,
    p_project_id: project.id,
    p_category: 'educational',
    p_status: 'draft',
    p_title: 'E2E draft',
    p_content_text: contentText,
    p_content_hash: contentHash,
    p_tweets: tweets,
    p_tag_names: ['e2e', 'testing'],
    p_media: [],
    p_created_via: 'web',
  })
  check('save_post_with_tweets (thread + tags)', !saveErr && !!postId, saveErr?.message)

  const { data: dupId } = await supa.rpc('find_duplicate_post', { p_content_hash: contentHash })
  check('find_duplicate_post detects exact repeat', dupId === postId, `got ${dupId}`)

  const { data: similar } = await supa.rpc('find_similar_posts', {
    p_content_text: normalize('Hello from the E2E runner — alpha bravo charlie delta!'),
    p_exclude_post_id: null,
    p_project_id: null,
    p_threshold: 0.45,
  })
  check(
    'find_similar_posts flags near-duplicate',
    (similar ?? []).some((s) => s.similarity >= 0.65),
    `top=${similar?.[0] ? Math.round(similar[0].similarity * 100) + '%' : 'n/a'}`,
  )

  const { data: threadPost } = await supa.rpc('save_post_with_tweets', {
    p_post_id: null,
    p_project_id: project.id,
    p_category: 'promotional',
    p_status: 'draft',
    p_title: 'E2E thread',
    p_content_text: normalize('first unique tweet one\nsecond unique tweet two'),
    p_content_hash: sha256hex(normalize('first unique tweet one\nsecond unique tweet two')),
    p_tweets: ['First unique tweet one', 'Second unique tweet two'],
    p_tag_names: ['thread', 'e2e'],
    p_media: [],
    p_created_via: 'web',
  })
  const { data: loaded, error: loadErr } = await supa
    .from('posts')
    .select('*, post_tweets(position, content), post_tags(tags(name))')
    .eq('id', threadPost)
    .maybeSingle()
  check(
    'thread saved with positions + tags',
    loaded?.post_tweets?.length === 2 && loaded?.post_tags?.length === 2,
    loadErr?.message ??
      `tweets=${loaded?.post_tweets?.length ?? '?'} tags=${loaded?.post_tags?.length ?? '?'}`,
  )

  // ── 3. MEDIA ─────────────────────────────────────────────
  console.log('\n▸ Media (R2)')
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  const form = new FormData()
  form.append('file', new Blob([png], { type: 'image/png' }), 'e2e.png')
  form.append('project_id', project.id)
  form.append('width', '1')
  form.append('height', '1')
  const upRes = await fetch(`${BASE_URL}/api/media/upload`, {
    method: 'POST',
    headers: authHeader,
    body: form,
  })
  const upBody = await upRes.json().catch(() => ({}))
  check('upload → R2 + assets row', upRes.status === 201 && !!upBody.asset, `HTTP ${upRes.status}`)

  let signedUrl
  if (upBody.asset) {
    const signRes = await api(`/api/media/sign?key=${encodeURIComponent(upBody.asset.r2_key)}`, {
      headers: authHeader,
    })
    const signBody = await signRes.json().catch(() => ({}))
    signedUrl = signBody.url
    check('sign (5-min URL)', signRes.status === 200 && !!signedUrl, `HTTP ${signRes.status} ${signBody.error ?? ''}`)

    if (signedUrl) {
      const getRes = await fetch(`${BASE_URL}${signedUrl}`)
      const bytes = await getRes.arrayBuffer()
      check(
        'serve signed URL (bytes match)',
        getRes.status === 200 && bytes.byteLength === png.length,
        `${getRes.status}, ${bytes.byteLength}B`,
      )
    }

    const forged = await fetch(`${BASE_URL}/api/media/${upBody.asset.r2_key}?exp=9999999999&sig=deadbeef`)
    check('forged signature rejected', forged.status === 403, `HTTP ${forged.status}`)
  }

  // ── 4. AGENT API (REST) ──────────────────────────────────
  console.log('\n▸ Agent REST API (/api/v1)')
  const { key: apiKey, hash, prefix } = makeApiKey()
  const { error: keyErr } = await supa.from('api_keys').insert({
    user_id: session.user.id,
    name: 'E2E key',
    key_hash: hash,
    prefix,
  })
  check('mint API key (hash stored, not the secret)', !keyErr, keyErr?.message)
  const agent = { Authorization: `Bearer ${apiKey}` }

  const r1 = await api('/api/v1/projects', { headers: agent })
  const r1b = await r1.json()
  check('GET /projects', r1.status === 200 && r1b.projects?.length >= 1)

  // ── project profile (logo/links/chains/pillars/samples/instructions) ──
  const rp = await api('/api/v1/projects', {
    method: 'POST',
    headers: agent,
    body: JSON.stringify({
      name: 'E2E Profile Project',
      description: 'Profile fields test',
      brand_voice: { tone: 'crisp', blacklist: ['zzzbannedterm'] },
      x_username: '@e2eagent',
      website_url: 'https://example.org',
      content_pillars: ['updates', 'memes'],
      sample_posts: ['A beloved sample tweet with words yankee zulu.'],
      custom_instructions: 'Never mention competitors.',
      official_links: [{ label: 'Discord', url: 'https://discord.gg/e2e' }],
    }),
  })
  const rpb = await rp.json()
  const prof = rpb.project ?? {}
  check(
    'POST /projects saves profile fields',
    rp.status === 201 &&
      prof.x_username === 'e2eagent' &&
      (prof.content_pillars ?? [])[0] === 'updates' &&
      (prof.sample_posts ?? []).length === 1 &&
      (prof.official_links ?? [])[0]?.label === 'Discord' &&
      prof.brand_voice?.blacklist?.[0] === 'zzzbannedterm',
    `HTTP ${rp.status} ${JSON.stringify(rpb).slice(0, 120)}`,
  )
  const profileProjectId = prof.id

  const rbl = await api('/api/v1/posts', {
    method: 'POST',
    headers: agent,
    body: JSON.stringify({
      project_id: profileProjectId,
      tweets: ['This one contains a zzzbannedterm inside.'],
    }),
  })
  const rblb = await rbl.json()
  check(
    'blacklist: banned term → 403',
    rbl.status === 403 && rblb.error === 'blacklisted',
    `HTTP ${rbl.status} ${rblb.error ?? ''}`,
  )

  const rpp = await api(`/api/v1/projects/${profileProjectId}`, {
    method: 'PATCH',
    headers: agent,
    body: JSON.stringify({ custom_instructions: 'Updated instructions.', content_pillars: ['updates'] }),
  })
  const rppb = await rpp.json()
  check(
    'PATCH /projects/:id updates profile',
    rpp.status === 200 && rppb.project?.custom_instructions === 'Updated instructions.',
    `HTTP ${rpp.status}`,
  )

  const r2 = await api('/api/v1/posts', {
    method: 'POST',
    headers: agent,
    body: JSON.stringify({
      project_id: project.id,
      title: 'Agent draft',
      category: 'promotional',
      tweets: ['Agent-created draft post with unique words zulu yankee xray.'],
    }),
  })
  const r2b = await r2.json()
  check('POST /posts creates draft', r2.status === 201 && r2b.post?.status === 'draft')
  check('created_via = api', r2b.post?.created_via === 'api')

  const r3 = await api('/api/v1/posts', {
    method: 'POST',
    headers: agent,
    body: JSON.stringify({
      project_id: project.id,
      tweets: ['Agent-created draft post with unique words zulu yankee xray.'],
    }),
  })
  const r3b = await r3.json()
  check('no-repeat: identical post → 409', r3.status === 409 && r3b.error === 'duplicate')

  const r4 = await api('/api/v1/posts', {
    method: 'POST',
    headers: agent,
    body: JSON.stringify({
      project_id: project.id,
      status: 'approved',
      tweets: ['Trying to sneak past the human gatekeeper with words papa quebec.'],
    }),
  })
  check('drafts-only: status=approved → 403', r4.status === 403, `HTTP ${r4.status}`)

  const postIdAgent = r2b.post?.id
  const r5 = await api(`/api/v1/posts/${postIdAgent}`, {
    method: 'PATCH',
    headers: agent,
    body: JSON.stringify({ title: 'Agent draft v2', tweets: ['Updated draft with words tango sierra romeo.'] }),
  })
  check('PATCH /posts/:id', r5.status === 200)

  const r6 = await api(`/api/v1/posts/${postIdAgent}/append`, {
    method: 'POST',
    headers: agent,
    body: JSON.stringify({ tweets: ['Appended second tweet with words papa oscar november.'] }),
  })
  const r6b = await r6.json()
  check('append_to_thread', r6.status === 200 && r6b.post?.tweets?.length === 2)

  const r7 = await api('/api/v1/knowledge', {
    method: 'POST',
    headers: agent,
    body: JSON.stringify({ project_id: project.id, title: 'E2E fact', content: 'Testing is good.' }),
  })
  check('POST /knowledge', r7.status === 201)

  const _r8 = await api('/api/v1/openapi.json').catch(() => null)
  const r9 = await api('/api/v1', { headers: agent })
  check('GET /api/v1 OpenAPI spec', r9.status === 200)

  const badKey = await api('/api/v1/projects', { headers: { Authorization: 'Bearer pgk_live_0000_deadbeef' } })
  check('bad key → 401', badKey.status === 401, `HTTP ${badKey.status}`)

  // ── 5. MCP ───────────────────────────────────────────────
  console.log('\n▸ MCP (/api/mcp)')
  const rpc = (method, params, id = 1) =>
    api('/api/mcp', {
      method: 'POST',
      headers: agent,
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    }).then((r) => r.json())

  const init = await rpc('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'e2e', version: '0' },
  })
  check('initialize', init.result?.serverInfo?.name === 'postgen', init.result?.protocolVersion)

  const tools = await rpc('tools/list', {}, 2)
  check('tools/list (6 tools)', tools.result?.tools?.length === 6)

  const call = await rpc(
    'tools/call',
    {
      name: 'create_draft',
      arguments: {
        project_id: project.id,
        title: 'MCP draft',
        tweets: ['Drafted over MCP with words mike charlie papa.'],
      },
    },
    3,
  )
  const callText = call.result?.content?.[0]?.text ?? ''
  check('tools/call create_draft', call.result?.isError === false && callText.includes('"post"'))

  const call2 = await rpc(
    'tools/call',
    {
      name: 'create_draft',
      arguments: { project_id: project.id, tweets: ['Drafted over MCP with words mike charlie papa.'] },
    },
    4,
  )
  const call2Text = call2.result?.content?.[0]?.text ?? ''
  check('tools/call no-repeat 409 surfaces as tool error', call2.result?.isError === true && call2Text.includes('duplicate'))

  const sim = await rpc('tools/call', { name: 'find_similar', arguments: { text: 'Drafted over MCP with words mike charlie papa.' } }, 5)
  check('tools/call find_similar', sim.result?.isError === false && sim.result?.content?.[0]?.text.includes('similar'))

  const resList = await rpc('resources/list', {}, 6)
  check('resources/list', (resList.result?.resources?.length ?? 0) >= 2)

  const read = await rpc('resources/read', { uri: `project://${project.id}/context` }, 7)
  const readText = read.result?.contents?.[0]?.text ?? ''
  check(
    'resources/read project://…/context',
    !!readText && readText.includes('brand_voice') && readText.includes('x_username'),
  )

  // ── 6. KEY REVOCATION + CLEANUP ──────────────────────────
  console.log('\n▸ Revocation + cleanup')
  await supa.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('key_hash', hash)
  const afterRevoke = await api('/api/v1/projects', { headers: agent })
  check('revoked key → 401', afterRevoke.status === 401, `HTTP ${afterRevoke.status}`)

  if (upBody.asset) {
    const del = await api('/api/media/delete', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ key: upBody.asset.r2_key }),
    })
    check('delete asset (R2 + row)', del.status === 200)
  }

  if (profileProjectId) await supa.from('projects').delete().eq('id', profileProjectId)
  await supa.from('projects').delete().eq('id', project.id)
  const { data: leftover } = await supa.from('projects').select('id').eq('id', project.id)
  check('cleanup: test project removed (cascade)', (leftover ?? []).length === 0)
  await supa.auth.signOut()

  console.log(`\n${'═'.repeat(50)}`)
  console.log(`RESULT: ${passed} passed, ${failed} failed${failures.length ? ` — ${failures.join('; ')}` : ''}`)
  console.log(`(test account ${email} can be deleted in Supabase → Authentication → Users)\n`)
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error('\n💥 E2E crashed:', e.message)
  process.exit(1)
})
