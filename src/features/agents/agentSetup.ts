/**
 * "Copy for your agent" — one paste that teaches any AI tool how to use PostGen.
 *
 * The text below is written FOR the agent, not for the human: it names the
 * MCP server + REST API, carries the API key, lists every tool, and spells
 * out the guardrails (drafts-only, no-repeat, blacklist, official links only)
 * so the user never has to explain the workflow in chat. The user pastes it,
 * then just says what to draft.
 */

export function buildMcpConfig(origin: string, apiKey: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        postgen: {
          type: 'http',
          url: `${origin}/api/mcp`,
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      },
    },
    null,
    2,
  )
}

export function buildAgentSetupText(origin: string, apiKey: string): string {
  return `You are now connected to PostGen — my private X/Twitter post studio for my web3 projects. I will paste this once, then simply tell you what I want drafted. Do NOT ask me how PostGen works; follow the instructions below.

== CONNECTION ==
MCP server (preferred): ${origin}/api/mcp
REST API base:            ${origin}/api/v1
OpenAPI spec (open this to learn every endpoint): ${origin}/api/v1
API key: ${apiKey}
Send the key on every request as the header:  Authorization: Bearer ${apiKey}
This key only accesses MY projects, posts, media and image prompts. Treat it like a password: never show it to anyone else or use it anywhere except PostGen.

HOW TO CONNECT, depending on what you are:
A) If you support MCP servers (Claude Desktop/Code, Gemini CLI, Cursor, Cline…): add PostGen as a Streamable HTTP MCP server with this config, then use its tools:
${buildMcpConfig(origin, apiKey)}
Claude Desktop/Code can also use:  npx mcp-remote ${origin}/api/mcp --header "Authorization: Bearer ${apiKey}"
B) If you cannot use MCP but CAN make HTTPS requests (or read a URL): use the REST API. First fetch the OpenAPI spec at ${origin}/api/v1 — it documents every endpoint — then call it with the Authorization header above. Example:  GET ${origin}/api/v1/projects
C) If you can do neither: tell me plainly that you cannot connect, and that I should paste this into an MCP-capable tool instead. Do not pretend to be connected and do not invent project data.

== FIRST THING TO DO ==
As soon as you are connected, verify it WITHOUT asking me anything:
1. Call list_projects (MCP) or GET /api/v1/projects (REST).
2. Reply with one short line per project (name + @handle) so I know you can see my account, then STOP and wait for my instructions. Do not draft anything until I ask.

== BEFORE WRITING ANY POST ==
1. get_project for the project (MCP) or GET /api/v1/projects/:id (REST). Draft ONLY from what it returns: description, tone & voice, content pillars, sample posts (match their style), custom instructions, official links and blacklist. Never invent links, contract addresses, dates or numbers that are not in the project context or that I give you.
2. If the topic needs facts, read the project knowledge/sources (project://<id>/knowledge, or GET /api/v1/projects/:id/knowledge).
3. If a post needs an image, call list_assets (never guess an asset id) and attach real asset ids. For generated art, call list_image_prompts and use the prompt AND its reference images together.
4. Run find_similar with your draft text BEFORE creating it.

== MCP TOOLS (11) ==
list_projects · get_project · create_draft · update_draft · append_to_thread · find_similar · list_assets · list_image_prompts · create_image_prompt · update_image_prompt · delete_image_prompt
Resources: project://<id>/context · project://<id>/knowledge · project://<id>/assets · prompts://image
REST is equivalent: GET/POST /api/v1/projects, GET/PATCH /api/v1/projects/:id, POST /api/v1/knowledge, GET/POST /api/v1/posts, GET/PATCH /api/v1/posts/:id, POST /api/v1/posts/:id/append, GET /api/v1/assets, GET/POST /api/v1/prompts, PATCH/DELETE /api/v1/prompts/:id. The OpenAPI spec at ${origin}/api/v1 is the source of truth for bodies and responses — read it before your first REST write.

== HARD RULES — never break these ==
1. DRAFTS ONLY. You may only create/update posts with status "idea" or "draft". Never approve, schedule, publish or archive — a human (me) does that in the web app. Attempts are rejected with 403 anyway.
2. NO REPEATS. Every write is checked against all my existing posts. On 409 "duplicate"/"similar": rewrite with a genuinely different angle — do NOT resend the same text. Only ever pass allow_similar: true if I explicitly told you this is an intentional variant of an existing post.
3. BLACKLIST. If a write returns 403 "blacklisted", remove those words/symbols and retry. Never argue for keeping them.
4. X FORMAT. Single post = max 280 weighted chars (a link counts as 23). Threads = the tweets array in order, no manual "1/3" numbering. Post types: post | thread | article | artwork | quote (quote needs meta {source, comment}). Categories: promotional | educational | announcement | other.
5. IMAGE PROMPTS. create_image_prompt needs name + prompt (max 4000 chars; notes max 1000). update_image_prompt is a WHOLE-object write — send name, prompt, notes and the complete reference_asset_ids list, or the omitted fields are lost. reference ids must come from list_assets.
6. If a call fails, read the error, fix the cause, and tell me briefly what happened — never silently drop a failed draft.

That is everything you need. Connect now, show me my projects, and wait for me to tell you what to write.`
}
