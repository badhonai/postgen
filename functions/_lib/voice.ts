/**
 * Voice provider plumbing (server-side only).
 *
 * The user's provider key is encrypted with AES-256-GCM under a per-user key
 * derived via HKDF-SHA256 from a server-only secret. Plaintext exists only in
 * memory for the duration of one request.
 */
import { serviceClient } from './auth'
import type { Env } from './env'

const ELEVEN_BASE = 'https://api.elevenlabs.io'
const encoder = new TextEncoder()

export type VoiceStatus = {
  configured: boolean
  provider: 'elevenlabs'
  voice_id: string | null
  voice_name: string | null
  daily_limit: number
  per_script_limit: number
  last_tested_at: string | null
  updated_at: string | null
  used_today: number
  remaining_today: number
}

function b64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function unb64(text: string): ArrayBuffer {
  const raw = atob(text)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes.buffer as ArrayBuffer
}

/** Server-only secret used as HKDF input material. Never reaches the client. */
function rootSecret(env: Env): string {
  const secret = env.VOICE_KEY_SECRET || env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('no server secret available for voice key encryption')
  return secret
}

async function userKey(env: Env, userId: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(rootSecret(env)), 'HKDF', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode(`postgen-voice:${userId}`),
      info: encoder.encode('voice-provider-key:aes-256-gcm'),
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptKey(env: Env, userId: string, plaintext: string): Promise<string> {
  const key = await userKey(env, userId)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext))
  return `${b64(iv)}.${b64(new Uint8Array(ct))}`
}

export async function decryptKey(env: Env, userId: string, blob: string): Promise<string> {
  const [ivPart, ctPart] = blob.split('.')
  if (!ivPart || !ctPart) throw new Error('malformed ciphertext')
  const key = await userKey(env, userId)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(ivPart) },
    key,
    unb64(ctPart),
  )
  return new TextDecoder().decode(plain)
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

type Row = {
  user_id: string
  provider: 'elevenlabs'
  voice_id: string
  voice_name: string | null
  key_cipher: string
  daily_limit: number
  per_script_limit: number
  last_tested_at: string | null
  updated_at: string
}

export async function readSettings(env: Env, userId: string): Promise<Row | null> {
  const db = serviceClient(env)
  const { data } = await db.from('voice_settings').select('*').eq('user_id', userId).maybeSingle()
  return (data as Row | null) ?? null
}

function startOfUtcDay(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

export async function usedToday(env: Env, userId: string): Promise<number> {
  const db = serviceClient(env)
  const { count } = await db
    .from('voice_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'ok')
    .gte('created_at', startOfUtcDay())
  return count ?? 0
}

export async function status(env: Env, userId: string): Promise<VoiceStatus> {
  const [row, used] = await Promise.all([readSettings(env, userId), usedToday(env, userId)])
  return {
    configured: !!row,
    provider: 'elevenlabs',
    voice_id: row?.voice_id ?? null,
    voice_name: row?.voice_name ?? null,
    daily_limit: row?.daily_limit ?? 20,
    per_script_limit: row?.per_script_limit ?? 2,
    last_tested_at: row?.last_tested_at ?? null,
    updated_at: row?.updated_at ?? null,
    used_today: used,
    remaining_today: Math.max(0, (row?.daily_limit ?? 20) - used),
  }
}

export async function saveSettings(
  env: Env,
  userId: string,
  input: {
    apiKey: string
    voiceId: string
    voiceName: string | null
    category?: string | null
    tier?: string | null
    warning?: string | null
  },
): Promise<VoiceStatus & { warning?: string | null; category?: string | null; tier?: string | null }> {
  const db = serviceClient(env)
  const keyCipher = await encryptKey(env, userId, input.apiKey)
  const { error } = await db.from('voice_settings').upsert(
    {
      user_id: userId,
      provider: 'elevenlabs',
      voice_id: input.voiceId,
      voice_name: input.voiceName,
      key_cipher: keyCipher,
      updated_at: new Date().toISOString(),
      last_tested_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(error.message)
  return {
    ...(await status(env, userId)),
    warning: input.warning ?? null,
    category: input.category ?? null,
    tier: input.tier ?? null,
  }
}

export async function deleteSettings(env: Env, userId: string): Promise<void> {
  const db = serviceClient(env)
  const { error } = await db.from('voice_settings').delete().eq('user_id', userId)
  if (error) throw new Error(error.message)
}

type ProviderError = { status: number; message: string }

async function providerFetch(path: string, apiKey: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 150_000)
  try {
    return await fetch(`${ELEVEN_BASE}${path}`, {
      ...init,
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

/** Sanitized provider error: never echoes the key or upstream headers. */
async function providerError(response: Response): Promise<ProviderError> {
  let message = `provider error ${response.status}`
  try {
    const body = (await response.json()) as { detail?: unknown }
    const detail = body?.detail
    if (typeof detail === 'string') message = detail
    else if (detail && typeof detail === 'object' && 'message' in detail) {
      message = String((detail as { message?: unknown }).message ?? message)
    }
  } catch {
    /* keep the generic message */
  }
  return { status: response.status, message: message.slice(0, 300) }
}

export type VoiceCheck = {
  ok: true
  name: string | null
  category: string | null
  tier: string | null
  /** Set when the provider will refuse an API synthesis (e.g. free plan + library voice). */
  warning: string | null
}

/**
 * Free validation (no synthesis, no charge): voice metadata + account plan, so a
 * plan/voice mismatch is reported when the key is saved instead of after a paid call.
 */
export async function validateVoice(
  apiKey: string,
  voiceId: string,
): Promise<VoiceCheck | { ok: false; error: ProviderError }> {
  const response = await providerFetch(`/v1/voices/${encodeURIComponent(voiceId)}`, apiKey)
  if (!response.ok) return { ok: false, error: await providerError(response) }
  const body = (await response.json()) as { name?: string; category?: string }

  let tier: string | null = null
  try {
    const sub = await providerFetch('/v1/user/subscription', apiKey)
    if (sub.ok) tier = String(((await sub.json()) as { tier?: string }).tier ?? '') || null
  } catch {
    /* plan is advisory only */
  }

  const category = body?.category ?? null
  let warning: string | null = null
  if (tier === 'free' && category && category !== 'premade' && category !== 'cloned') {
    warning =
      `This voice is a ${category} voice. ElevenLabs refuses ${category} voices on the API for ` +
      'free accounts ("Free users cannot use library voices via the API"), so generation will fail. ' +
      'Add a premade/cloned voice, or upgrade the ElevenLabs plan.'
  }

  return { ok: true, name: body?.name ?? null, category, tier, warning }
}

export type VoiceoverOutcome = { status: number; body: Record<string, unknown> }

export type VoiceoverResult = {
  asset_id: string
  r2_key: string
  characters: number
  voice_id: string
  alignment: unknown
}

/** Synthesize narration with character timestamps so captions can be aligned. */
export async function generateVoiceover(
  env: Env,
  input: { userId: string; projectId: string; apiKey: string; voiceId: string; text: string },
): Promise<{ ok: true; result: VoiceoverResult } | { ok: false; error: ProviderError }> {
  const response = await providerFetch(
    `/v1/text-to-speech/${encodeURIComponent(input.voiceId)}/with-timestamps?output_format=mp3_44100_128`,
    input.apiKey,
    {
      method: 'POST',
      body: JSON.stringify({
        text: input.text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.8,
          style: 0.35,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }),
    },
  )
  if (!response.ok) return { ok: false, error: await providerError(response) }

  const payload = (await response.json()) as {
    audio_base64?: string
    alignment?: unknown
    normalized_alignment?: unknown
  }
  if (!payload.audio_base64) return { ok: false, error: { status: 502, message: 'provider returned no audio' } }

  const binary = Uint8Array.from(atob(payload.audio_base64), (c) => c.charCodeAt(0))
  const stem = Date.now().toString(36)
  const r2Key = `users/${input.userId}/projects/${input.projectId}/voice/${stem}-${crypto.randomUUID().slice(0, 8)}.mp3`

  await env.MEDIA.put(r2Key, binary.buffer as ArrayBuffer, {
    httpMetadata: { contentType: 'audio/mpeg' },
  })

  const db = serviceClient(env)
  const { data: asset, error } = await db
    .from('assets')
    .insert({
      user_id: input.userId,
      project_id: input.projectId,
      r2_key: r2Key,
      filename: `voiceover-${stem}.mp3`,
      mime_type: 'audio/mpeg',
      size_bytes: binary.byteLength,
    })
    .select('id')
    .single()

  if (error || !asset) {
    await env.MEDIA.delete(r2Key).catch(() => undefined)
    return { ok: false, error: { status: 500, message: error?.message ?? 'could not record asset' } }
  }

  return {
    ok: true,
    result: {
      asset_id: String((asset as { id: string }).id),
      r2_key: r2Key,
      characters: input.text.length,
      voice_id: input.voiceId,
      alignment: payload.normalized_alignment ?? payload.alignment ?? null,
    },
  }
}

/**
 * Shared cap-check + synthesis used by the REST route and the MCP tool.
 * Returns a ready JSON body and HTTP status; never throws for expected failures.
 */
export async function runVoiceover(
  env: Env,
  auth: { userId: string; keyId: string },
  input: { projectId: string; text: string; voiceId?: string; dryRun?: boolean },
): Promise<VoiceoverOutcome> {
  const text = input.text.trim()
  if (!input.projectId) return { status: 400, body: { error: 'project_id is required' } }
  if (!text) return { status: 400, body: { error: 'text is required' } }
  if (text.length > 5000) return { status: 400, body: { error: 'text too long (max 5000 characters)' } }

  const db = serviceClient(env)
  const { data: project } = await db
    .from('projects')
    .select('id')
    .eq('id', input.projectId)
    .eq('user_id', auth.userId)
    .maybeSingle()
  if (!project) return { status: 404, body: { error: 'project not found' } }

  const settings = await readSettings(env, auth.userId)
  if (!settings) {
    return {
      status: 400,
      body: {
        error: 'voice is not configured — add an ElevenLabs key in PostGen → Settings → Voiceover',
      },
    }
  }
  let voiceId = settings.voice_id
  if (input.voiceId && input.voiceId !== settings.voice_id) {
    // An override must be a voice the same account can actually use.
    const key = await decryptKey(env, auth.userId, settings.key_cipher).catch(() => null)
    if (!key) return { status: 500, body: { error: 'could not read the stored key' } }
    const check = await validateVoice(key, input.voiceId)
    if (!check.ok) return { status: 400, body: { error: 'voice_id is not available on this account' } }
    if ('warning' in check && check.warning) {
      return { status: 400, body: { error: check.warning, voice_id: input.voiceId } }
    }
    voiceId = input.voiceId
  }

  const scriptHash = await sha256Hex(text)
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()
  const [{ count: sameScript }, used] = await Promise.all([
    db
      .from('voice_generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
      .eq('script_hash', scriptHash)
      .eq('status', 'ok')
      .gte('created_at', since),
    usedToday(env, auth.userId),
  ])

  if ((sameScript ?? 0) >= settings.per_script_limit) {
    return {
      status: 409,
      body: {
        error: 'script already generated',
        detail: `this exact script has used ${settings.per_script_limit}/${settings.per_script_limit} attempts in the last 24h; edit the text or ask the owner`,
      },
    }
  }
  if (used >= settings.daily_limit) {
    return {
      status: 429,
      body: { error: 'daily voiceover limit reached', detail: `${used}/${settings.daily_limit} today (UTC)` },
    }
  }

  if (input.dryRun) {
    // Everything validated, nothing spent: lets clients confirm configuration + caps.
    return {
      status: 200,
      body: {
        dry_run: true,
        configured: true,
        voice_id: voiceId,
        voice_name: settings.voice_name,
        characters: text.length,
        can_generate: true,
        caps: {
          daily_limit: settings.daily_limit,
          used_today: used,
          remaining_today: Math.max(0, settings.daily_limit - used),
          per_script_limit: settings.per_script_limit,
          remaining_for_script: Math.max(0, settings.per_script_limit - (sameScript ?? 0)),
        },
      },
    }
  }

  let apiKey: string
  try {
    apiKey = await decryptKey(env, auth.userId, settings.key_cipher)
  } catch {
    return { status: 500, body: { error: 'could not read the stored key — re-save it in Settings' } }
  }

  const outcome = await generateVoiceover(env, {
    userId: auth.userId,
    projectId: input.projectId,
    apiKey,
    voiceId,
    text,
  })

  if (!outcome.ok) {
    await db.from('voice_generations').insert({
      user_id: auth.userId,
      api_key_id: auth.keyId,
      script_hash: scriptHash,
      characters: text.length,
      status: 'error',
      error: outcome.error.message,
    })
    return {
      status: outcome.error.status === 401 ? 400 : 502,
      body: { error: `provider error: ${outcome.error.message}` },
    }
  }

  const result = outcome.result
  await db.from('voice_generations').insert({
    user_id: auth.userId,
    api_key_id: auth.keyId,
    script_hash: scriptHash,
    characters: result.characters,
    asset_id: result.asset_id,
    alignment: result.alignment,
    status: 'ok',
  })

  return {
    status: 201,
    body: {
      asset_id: result.asset_id,
      r2_key: result.r2_key,
      voice_id: result.voice_id,
      characters: result.characters,
      has_alignment: !!result.alignment,
      alignment: result.alignment,
      caps: {
        daily_limit: settings.daily_limit,
        remaining_today: Math.max(0, settings.daily_limit - (used + 1)),
        per_script_limit: settings.per_script_limit,
        remaining_for_script: Math.max(0, settings.per_script_limit - ((sameScript ?? 0) + 1)),
      },
    },
  }
}
