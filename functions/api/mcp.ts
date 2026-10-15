import * as agent from '../_lib/agentdb'
import { requireApiKey } from '../_lib/apikey'
import { jsonError, type Env } from '../_lib/env'

/**
 * PostGen MCP server — Streamable HTTP (stateless, JSON-RPC 2.0).
 * Auth: `Authorization: Bearer pgk_live_…` on every request.
 * Same capabilities & guardrails as the REST API (drafts-only, no-repeat).
 */

const SERVER_INFO = { name: 'postgen', version: '1.0.0' }
const SUPPORTED_PROTOCOLS = ['2025-03-26', '2025-06-18', '2024-11-05']

const TOOLS = [
  {
    name: 'list_projects',
    description: 'List the user’s web3 projects — id, name, @handle and post count ONLY (lite). Call get_project for the full profile of the one project you will work on.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_project',
    description: 'Get ONE project in full: description, brand voice & blacklist, pillars, samples, custom instructions, official links, knowledge, char_limit (280 or 25000 for X Premium) and brand_logo (use brand_logo.transparent_name for generated images unless custom_instructions say otherwise).',
    inputSchema: {
      type: 'object',
      properties: { project_id: { type: 'string', description: 'Project UUID' } },
      required: ['project_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_draft',
    description:
      'Create a DRAFT post (single tweet or thread) for a project. Runs the no-repeat ' +
      'guard — on 409 retry with allow_similar=true ONLY if this is an intentional variant. ' +
      'Status is idea|draft; a human approves/publishes. Respect the project char_limit from get_project (280, or 25000 if the account has X Premium); over-limit writes are rejected.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        title: { type: 'string', description: 'Internal label (not posted to X)' },
        category: {
          type: 'string',
          enum: ['promotional', 'educational', 'announcement', 'other'],
        },
        status: { type: 'string', enum: ['idea', 'draft'] },
        type: {
          type: 'string',
          enum: ['post', 'thread', 'article', 'artwork', 'quote'],
          description: 'post = one post, thread = the tweets array, article = long-form body, artwork = media + caption, quote = quote + source + comment',
        },
        meta: {
          type: 'object',
          description: 'Type-specific extras. quote: { source, comment }',
          properties: {
            source: { type: 'string' },
            comment: { type: 'string' },
          },
        },
        tweets: {
          type: 'array',
          items: { type: 'string' },
          description: 'Thread tweets in order (max 280 weighted chars each)',
        },
        tag_names: { type: 'array', items: { type: 'string' } },
        media: {
          type: 'array',
          description: 'Images to attach: [{ asset_id, tweet_position }]. tweet_position is 1-based (default 1).',
          items: {
            type: 'object',
            properties: {
              asset_id: { type: 'string' },
              tweet_position: { type: 'integer', minimum: 1 },
            },
            required: ['asset_id'],
          },
        },
        allow_similar: { type: 'boolean', default: false },
      },
      required: ['project_id', 'tweets'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_draft',
    description: 'Update an existing DRAFT (title, status idea|draft, tweets, tags).',
    inputSchema: {
      type: 'object',
      properties: {
        post_id: { type: 'string' },
        title: { type: 'string' },
        status: { type: 'string', enum: ['idea', 'draft'] },
        type: {
          type: 'string',
          enum: ['post', 'thread', 'article', 'artwork', 'quote'],
        },
        meta: {
          type: 'object',
          description: 'Type-specific extras. quote: { source, comment }',
          properties: {
            source: { type: 'string' },
            comment: { type: 'string' },
          },
        },
        tweets: { type: 'array', items: { type: 'string' } },
        tag_names: { type: 'array', items: { type: 'string' } },
        media: {
          type: 'array',
          description: 'Images to attach (replaces the current set): [{ asset_id, tweet_position }].',
          items: {
            type: 'object',
            properties: {
              asset_id: { type: 'string' },
              tweet_position: { type: 'integer', minimum: 1 },
            },
            required: ['asset_id'],
          },
        },
        allow_similar: { type: 'boolean', default: false },
      },
      required: ['post_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'append_to_thread',
    description: 'Append tweets to the end of an existing thread draft.',
    inputSchema: {
      type: 'object',
      properties: {
        post_id: { type: 'string' },
        tweets: { type: 'array', items: { type: 'string' } },
        allow_similar: { type: 'boolean', default: false },
      },
      required: ['post_id', 'tweets'],
      additionalProperties: false,
    },
  },
  {
    name: 'find_similar',
    description:
      'Check text against the user’s existing posts BEFORE writing. Returns similar posts ' +
      'with similarity scores (≥0.65 would be blocked as a repeat).',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        project_id: { type: 'string' },
      },
      required: ['text'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_posts',
    description:
      'List existing posts (id, project, type, status, title, content) — use BEFORE drafting a batch ' +
      'so the new posts do not repeat topics already covered. Filter by project and/or status.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        status: { type: 'string', enum: ['idea', 'draft', 'approved', 'scheduled', 'published', 'archived'] },
        type: { type: 'string', enum: ['post', 'thread', 'article', 'artwork', 'quote'] },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_assets',
    description:
      'List the user’s media (optionally for one project). Each asset has a short-lived ' +
      'signed URL you can fetch to SEE the image, plus filename, mime, size, dimensions, ' +
      'alt text and kind. Use this to pick images for a draft — you cannot guess asset ids.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Restrict to one project (optional).' },
        kind: { type: 'string', description: 'Restrict to one asset kind, e.g. logo_transparent_name (optional).' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_image_prompts',
    description:
      'List the user’s saved image prompts. Each has the prompt text, notes, project_ids ' +
      '(empty = global), cover_assets (signed URLs showing how the output LOOKS — preview ' +
      'only, never feed them to an image model), and color_codes (optional hex palette to ' +
      'use when generating). reference_assets is ONLY filled when the prompt’s ' +
      'use_reference_images flag is true — only then may you use those images as generation ' +
      'references. Pass project_id to receive ONLY that project’s prompts plus globals.',
    inputSchema: {
      type: 'object',
      properties: { project_id: { type: 'string', description: 'Only prompts for this project + globals.' } },
      additionalProperties: false,
    },
  },
  {
    name: 'create_image_prompt',
    description:
      'Save a new image prompt to the user’s library, optionally with reference images ' +
      '(saved as the prompt’s cover) and color codes. Use list_assets first for asset ids.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Short label, e.g. "Neon poster"' },
        prompt: { type: 'string', description: 'The image prompt itself (max 4000 chars)' },
        notes: { type: 'string', description: 'What output this tends to produce (max 1000 chars)' },
        reference_asset_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Asset ids showing the style. Must be the user’s own assets.',
        },
        project_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Projects this prompt is for. Empty/omitted = global (any project).',
        },
        use_reference_images: {
          type: 'boolean',
          description: 'May the reference (cover) images be used as generation references? Default false — cover only.',
        },
        color_codes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Hex colors (e.g. #FF1E2D) the image should use. Max 12.',
        },
      },
      required: ['name', 'prompt'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_image_prompt',
    description:
      'Replace an existing image prompt. Sends the whole prompt — name, prompt text, notes, ' +
      'reference_asset_ids, project_ids, use_reference_images and color_codes are all ' +
      'overwritten, so pass the full intended values.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt_id: { type: 'string' },
        name: { type: 'string' },
        prompt: { type: 'string' },
        notes: { type: 'string' },
        reference_asset_ids: { type: 'array', items: { type: 'string' } },
        project_ids: { type: 'array', items: { type: 'string' }, description: 'Projects this prompt is for; empty = global.' },
        use_reference_images: { type: 'boolean', description: 'May the cover images be used as generation references? Default false.' },
        color_codes: { type: 'array', items: { type: 'string' }, description: 'Hex colors the image should use. Max 12.' },
      },
      required: ['prompt_id', 'name', 'prompt'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_image_prompt',
    description: 'Permanently remove an image prompt from the user’s library.',
    inputSchema: {
      type: 'object',
      properties: { prompt_id: { type: 'string' } },
      required: ['prompt_id'],
      additionalProperties: false,
    },
  },
] as const

type Rpc = { jsonrpc: '2.0'; id?: number | string | null; method: string; params?: Record<string, unknown> }

function rpcResult(id: number | string | null | undefined, result: unknown) {
  return { jsonrpc: '2.0' as const, id: id ?? null, result }
}

function rpcError(id: number | string | null | undefined, code: number, message: string) {
  return { jsonrpc: '2.0' as const, id: id ?? null, error: { code, message } }
}

function toolText(data: unknown, isError = false) {
  return {
    content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }],
    isError,
  }
}

async function callTool(
  name: string,
  args: Record<string, unknown>,
  env: Env,
  auth: agent.AgentAuth,
  origin: string,
) {
  const via = 'mcp' as const
  switch (name) {
    case 'list_projects':
      return toolText({ projects: await agent.listProjects(env, auth.userId) })
    case 'get_project':
      return toolText(await agent.getProject(env, auth.userId, String(args.project_id ?? ''), origin))
    case 'create_draft':
      return toolText(
        { post: await agent.createDraft(env, auth, via, {
            projectId: args.project_id as string | undefined,
            title: args.title as string | undefined,
            category: args.category as 'promotional' | undefined,
            type: args.type as agent.PostType | undefined,
            status: args.status as 'idea' | 'draft' | undefined,
            tweets: args.tweets as string[],
            tagNames: args.tag_names as string[] | undefined,
            meta: (args.meta as Record<string, unknown> | undefined) ?? undefined,
            media: args.media as Array<{ asset_id: string; tweet_position?: number }> | undefined,
            allowSimilar: args.allow_similar === true,
          }) },
      )
    case 'update_draft':
      return toolText(
        { post: await agent.updateDraft(env, auth, via, String(args.post_id ?? ''), {
            title: args.title as string | undefined,
            type: args.type as agent.PostType | undefined,
            status: args.status as 'idea' | 'draft' | undefined,
            tweets: args.tweets as string[] | undefined,
            tagNames: args.tag_names as string[] | undefined,
            meta: (args.meta as Record<string, unknown> | undefined) ?? undefined,
            media: args.media as Array<{ asset_id: string; tweet_position?: number }> | undefined,
            allowSimilar: args.allow_similar === true,
          }) },
      )
    case 'append_to_thread':
      return toolText(
        { post: await agent.appendThread(env, auth, via, String(args.post_id ?? ''), args.tweets as string[], {
            allowSimilar: args.allow_similar === true,
          }) },
      )
    case 'find_similar':
      return toolText(
        await agent.findSimilar(env, auth.userId, String(args.text ?? ''), {
          projectId: args.project_id as string | undefined,
        }),
      )
    case 'list_posts':
      return toolText({
        posts: await agent.listPosts(env, auth.userId, {
          projectId: args.project_id as string | undefined,
          status: args.status as string | undefined,
          type: args.type as string | undefined,
        }),
      })
    case 'list_assets':
      return toolText({
        assets: await agent.listAssets(env, auth.userId, {
          projectId: args.project_id as string | undefined,
          kind: args.kind as string | undefined,
          origin,
        }),
      })
    case 'list_image_prompts':
      return toolText({ image_prompts: await agent.listImagePrompts(env, auth.userId, origin, { projectId: args.project_id as string | undefined }) })
    case 'create_image_prompt':
      return toolText({
        image_prompt: await agent.createImagePrompt(env, auth, via, {
          name: args.name,
          prompt: args.prompt,
          notes: args.notes,
          referenceAssetIds: args.reference_asset_ids,
          projectIds: args.project_ids,
          useReferenceImages: args.use_reference_images,
          colorCodes: args.color_codes,
        }),
      })
    case 'update_image_prompt':
      return toolText({
        image_prompt: await agent.updateImagePrompt(env, auth, via, String(args.prompt_id ?? ''), {
          name: args.name,
          prompt: args.prompt,
          notes: args.notes,
          referenceAssetIds: args.reference_asset_ids,
          projectIds: args.project_ids,
          useReferenceImages: args.use_reference_images,
          colorCodes: args.color_codes,
        }),
      })
    case 'delete_image_prompt':
      return toolText({
        deleted: await agent.deleteImagePrompt(env, auth, via, String(args.prompt_id ?? '')),
      })
    default:
      throw new agent.AgentError(-32602, { error: `unknown tool: ${name}` })
  }
}

async function readResource(uri: string, env: Env, auth: agent.AgentAuth, origin: string) {
  if (uri === 'prompts://image') {
    const prompts = await agent.listImagePrompts(env, auth.userId, origin)
    return {
      contents: [
        { uri, mimeType: 'application/json', text: JSON.stringify({ image_prompts: prompts }, null, 2) },
      ],
    }
  }
  const m = uri.match(/^project:\/\/([^/]+)\/(context|knowledge|assets)$/)
  if (!m) throw new agent.AgentError(-32602, { error: `unknown resource: ${uri}` })
  const project = await agent.getProject(env, auth.userId, m[1], origin)
  if (m[2] === 'knowledge') {
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ knowledge: project.knowledge }, null, 2) }],
    }
  }
  if (m[2] === 'assets') {
    const assets = await agent.listAssets(env, auth.userId, { projectId: m[1], origin })
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ assets }, null, 2) }],
    }
  }
  const text = JSON.stringify(
    {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        brand_voice: project.brand_voice,
        x_username: project.x_username,
        website_url: project.website_url,
        content_pillars: project.content_pillars,
        sample_posts: project.sample_posts,
        custom_instructions: project.custom_instructions,
        official_links: project.official_links,
        logo_asset_id: project.logo_asset_id,
      },
      knowledge_titles: (project.knowledge as Array<{ title: string }>).map((k) => k.title),
    },
    null,
    2,
  )
  return { contents: [{ uri, mimeType: 'application/json', text }] }
}

export async function onRequestPost(context: {
  request: Request
  env: Env
}): Promise<Response> {
  const { request, env } = context
  // absolute URLs for signed media — external agents can't resolve a relative path
  const origin = new URL(request.url).origin

  const gate = await requireApiKey(request, env)
  if (!gate.ok) return gate.response
  const auth = gate.auth

  let msg: Rpc
  try {
    msg = (await request.json()) as Rpc
  } catch {
    return Response.json(rpcError(null, -32700, 'parse error'), { status: 400 })
  }
  if (!msg || typeof msg.method !== 'string') {
    return Response.json(rpcError(null, -32600, 'invalid request'), { status: 400 })
  }

  // notifications (no id) → 202, no body
  const isNotification = msg.id === undefined

  try {
    switch (msg.method) {
      case 'initialize': {
        const requested = String((msg.params as { protocolVersion?: string })?.protocolVersion ?? '')
        const protocolVersion = SUPPORTED_PROTOCOLS.includes(requested)
          ? requested
          : SUPPORTED_PROTOCOLS[0]
        return Response.json(
          rpcResult(msg.id, {
            protocolVersion,
            capabilities: { tools: {}, resources: {} },
            serverInfo: SERVER_INFO,
            instructions:
              'PostGen — draft posts for the user’s web3 projects. You can only create/update ' +
              'drafts (a human approves & publishes). Workflow: list_projects (lite) → get_project ' +
              'for the ONE chosen project → list_posts to see what exists → find_similar before ' +
              'writing → create_draft (respect char_limit: 280, or 25000 for X Premium). For images ' +
              'use list_image_prompts with project_id and brand_logo.transparent_name from get_project.',
          }),
        )
      }
      case 'ping':
        return Response.json(rpcResult(msg.id, {}))
      case 'tools/list':
        return Response.json(rpcResult(msg.id, { tools: TOOLS }))
      case 'tools/call': {
        const params = (msg.params ?? {}) as { name?: string; arguments?: Record<string, unknown> }
        if (!params.name) return Response.json(rpcError(msg.id, -32602, 'missing tool name'))
        try {
          return Response.json(rpcResult(msg.id, await callTool(params.name, params.arguments ?? {}, env, auth, origin)))
        } catch (e) {
          const body = e instanceof agent.AgentError ? e.body : { error: 'tool failed' }
          return Response.json(
            rpcResult(msg.id, toolText(body, true)),
          )
        }
      }
      case 'resources/list': {
        const projects = await agent.listProjects(env, auth.userId)
        const resources = (projects as unknown as Array<{ id: string; name: string }>).flatMap((p) => [
          {
            uri: `project://${p.id}/context`,
            name: `${p.name} — context`,
            mimeType: 'application/json',
          },
          {
            uri: `project://${p.id}/knowledge`,
            name: `${p.name} — knowledge & sources`,
            mimeType: 'application/json',
          },
          {
            uri: `project://${p.id}/assets`,
            name: `${p.name} — media & signed URLs`,
            mimeType: 'application/json',
          },
        ])
        resources.push({
          uri: 'prompts://image',
          name: 'Saved image prompts & reference media',
          mimeType: 'application/json',
        })
        return Response.json(rpcResult(msg.id, { resources }))
      }
      case 'resources/read': {
        const uri = String((msg.params as { uri?: string })?.uri ?? '')
        return Response.json(rpcResult(msg.id, await readResource(uri, env, auth, origin)))
      }
      default:
        if (isNotification) return new Response(null, { status: 202 })
        return Response.json(rpcError(msg.id, -32601, `method not found: ${msg.method}`))
    }
  } catch (e) {
    const message = e instanceof agent.AgentError ? JSON.stringify(e.body) : 'internal error'
    return Response.json(rpcError(msg.id, -32000, message))
  }
}

export function onRequestGet(): Response {
  return jsonError('MCP Streamable HTTP is stateless — use POST with JSON-RPC messages', 405)
}

export function onRequestDelete(): Response {
  return new Response(null, { status: 204 })
}
