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
    description: 'List the user’s web3 projects (id, name, slug, brand voice).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_project',
    description: 'Get one project with its description, brand voice, knowledge & sources.',
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
      'Status is idea|draft; a human approves/publishes.',
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
        tweets: {
          type: 'array',
          items: { type: 'string' },
          description: 'Thread tweets in order (max 280 weighted chars each)',
        },
        tag_names: { type: 'array', items: { type: 'string' } },
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
        tweets: { type: 'array', items: { type: 'string' } },
        tag_names: { type: 'array', items: { type: 'string' } },
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
) {
  const via = 'mcp' as const
  switch (name) {
    case 'list_projects':
      return toolText({ projects: await agent.listProjects(env, auth.userId) })
    case 'get_project':
      return toolText(await agent.getProject(env, auth.userId, String(args.project_id ?? '')))
    case 'create_draft':
      return toolText(
        { post: await agent.createDraft(env, auth, via, {
            projectId: args.project_id as string | undefined,
            title: args.title as string | undefined,
            category: args.category as 'promotional' | undefined,
            status: args.status as 'idea' | 'draft' | undefined,
            tweets: args.tweets as string[],
            tagNames: args.tag_names as string[] | undefined,
            allowSimilar: args.allow_similar === true,
          }) },
      )
    case 'update_draft':
      return toolText(
        { post: await agent.updateDraft(env, auth, via, String(args.post_id ?? ''), {
            title: args.title as string | undefined,
            status: args.status as 'idea' | 'draft' | undefined,
            tweets: args.tweets as string[] | undefined,
            tagNames: args.tag_names as string[] | undefined,
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
    default:
      throw new agent.AgentError(-32602, { error: `unknown tool: ${name}` })
  }
}

async function readResource(uri: string, env: Env, auth: agent.AgentAuth) {
  const m = uri.match(/^project:\/\/([^/]+)\/(context|knowledge)$/)
  if (!m) throw new agent.AgentError(-32602, { error: `unknown resource: ${uri}` })
  const project = await agent.getProject(env, auth.userId, m[1])
  const text =
    m[2] === 'knowledge'
      ? JSON.stringify({ knowledge: project.knowledge }, null, 2)
      : JSON.stringify(
          {
            project: {
              id: project.id,
              name: project.name,
              description: project.description,
              brand_voice: project.brand_voice,
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
              'drafts (a human approves & publishes). Always run find_similar before writing ' +
              'repeated topics; the create/update tools also enforce a no-repeat guard.',
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
          return Response.json(rpcResult(msg.id, await callTool(params.name, params.arguments ?? {}, env, auth)))
        } catch (e) {
          const body = e instanceof agent.AgentError ? e.body : { error: 'tool failed' }
          return Response.json(
            rpcResult(msg.id, toolText(body, true)),
          )
        }
      }
      case 'resources/list': {
        const projects = await agent.listProjects(env, auth.userId)
        const resources = (projects as Array<{ id: string; name: string }>).flatMap((p) => [
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
        ])
        return Response.json(rpcResult(msg.id, { resources }))
      }
      case 'resources/read': {
        const uri = String((msg.params as { uri?: string })?.uri ?? '')
        return Response.json(rpcResult(msg.id, await readResource(uri, env, auth)))
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
