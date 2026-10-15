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
  return `You are now connected to PostGen — my private X/Twitter post studio for my web3 projects. I will paste this once, then simply tell you what I want (e.g. "make 10 posts for Retium"). Do NOT ask me how PostGen works; follow the instructions below.

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
B) If you cannot use MCP but CAN make HTTPS requests (or read a URL): use the REST API. First fetch the OpenAPI spec at ${origin}/api/v1 — it documents every endpoint — then call it with the Authorization header above. Example:  GET ${origin}/api/v1/projects  ·  upload an image: POST ${origin}/api/v1/assets/upload (multipart: file + project_id)
C) If you can do neither: tell me plainly that you cannot connect, and that I should paste this into an MCP-capable tool instead. Do not pretend to be connected and do not invent project data.

== FIRST THING TO DO ==
As soon as you are connected, verify it WITHOUT asking me anything:
1. Call list_projects (MCP) or GET /api/v1/projects (REST). This is a LITE list — names and counts only, on purpose.
2. Reply with one short line per project (name + @handle) so I know you can see my account, then STOP and wait for my instructions. Do not load any project's details and do not draft anything until I ask.

== WHEN I NAME A PROJECT (e.g. "make 10 posts for Retium") ==
Work on that ONE project only, in this order:
1. Match the name I said to one project from the list (case-insensitive). If none or more than one match, ask me — never guess.
2. get_project for that project (REST: GET /api/v1/projects/:id). It gives you everything: description, tone & voice, blacklist, content pillars, sample posts (match their style), custom instructions, official links, knowledge, char_limit, and brand_logo. Never invent links, contract addresses, dates or numbers that are not in this context or that I give you.
3. list_posts for that project (REST: GET /api/v1/posts?project_id=…) and scan what already exists, so the new batch covers NEW angles. Also run find_similar on each draft before saving it.
4. Plan the batch BEFORE writing: N posts, each with a different pillar and a different hook/opening. Keep the plan in mind for the whole batch — posts inside the same batch must not repeat each other either (the no-repeat guard cannot see unsaved batch-mates).

== LOGO & IMAGES ==
- get_project returns brand_logo with signed URLs. DEFAULT: brand_logo.transparent_name (transparent logo with the project name). Only use brand_logo.full or brand_logo.icon if the project's custom_instructions say so. If transparent_name is missing, TELL ME and ask me to upload one in the project form — never invent or redraw a fake logo.
- For post images: call list_image_prompts WITH project_id (REST: GET /api/v1/prompts?project_id=…). You will receive that project's prompts (project-tagged first) plus global ones. Tagging wins: use a project-tagged prompt when one exists.
- If several prompts fit, SHUFFLE them and cycle without repeating one until all have been used — do not use the same prompt for every post in a batch.
- Each prompt may come with cover_assets — images showing how that prompt's output LOOKS. They are a preview for you, NOT generation input: never pass covers to the image model UNLESS the prompt has use_reference_images: true; only then do the same images also arrive in reference_assets, and you should use them as references. If a prompt has color_codes, the generated image must use exactly those hex colors as its palette.
- Generate the scene without asking the image model to draw the logo as text; use the logo image as a reference (or composite the real transparent PNG on top if your tools can). Then LOOK at every generated image before using it: reject it and regenerate if the logo is warped/misspelled, if there is fake gibberish text, or if it looks off-brand.
- Upload each approved image BEFORE attaching it: POST ${origin}/api/v1/assets/upload (multipart form: file=<image>, project_id=<id>) → you get an asset id. Then create/update the draft with media: [{ asset_id, tweet_position: 1 }]. On MCP-only clients without file upload, tell me you cannot upload and hand me the images instead of silently skipping them.
- Signed media URLs expire in ~15 minutes — fetch brand_logo / assets right before you need them, and re-fetch if one has expired.

== WRITING & THE LINT (run on EVERY post before saving) ==
1. Character limit = the project's char_limit from get_project: 25,000 weighted chars (a link counts as 23) for every account. Over-limit writes are rejected by the server — shorten, don't retry unchanged. Threads: the limit applies per tweet; no manual "1/3" numbering.
2. Blacklist: never use the project's blacklisted words/symbols. A 403 "blacklisted" means remove them and retry.
3. No repeats: not similar to existing posts (find_similar) and not similar to the other posts in this batch. On 409 "duplicate"/"similar", rewrite with a genuinely different angle — only pass allow_similar: true if I explicitly said this is an intentional variant.
4. Style: follow tone & voice, content pillars and sample posts; use ONLY official links from the project context.
5. SAVE ORDER: save all the text drafts FIRST (create_draft), then generate/upload images and attach them with update_draft. If image generation fails halfway, the finished drafts must already be saved.

== MCP TOOLS (12) ==
list_projects · get_project · list_posts · create_draft · update_draft · append_to_thread · find_similar · list_assets (project_id, kind filters) · list_image_prompts (project_id filter) · create_image_prompt · update_image_prompt · delete_image_prompt
Resources: project://<id>/context · project://<id>/knowledge · project://<id>/assets · prompts://image
REST equivalents: GET/POST /api/v1/projects, GET/PATCH /api/v1/projects/:id, POST /api/v1/knowledge, GET/POST /api/v1/posts, GET/PATCH /api/v1/posts/:id, POST /api/v1/posts/:id/append, GET /api/v1/assets, POST /api/v1/assets/upload, GET/POST /api/v1/prompts, PATCH/DELETE /api/v1/prompts/:id. The OpenAPI spec at ${origin}/api/v1 is the source of truth — read it before your first REST write.

== HARD RULES — never break these ==
1. DRAFTS ONLY. You may only create/update posts with status "idea" or "draft". Never approve, schedule, publish or archive — I do that in the web app. Attempts are rejected with 403 anyway.
2. Image prompts: create_image_prompt needs name + prompt (max 4000 chars; notes max 1000) and project_ids (empty = global). update_image_prompt is a WHOLE-object write — send name, prompt, notes, the complete reference_asset_ids, project_ids, use_reference_images AND color_codes, or omitted fields are lost. Reference ids must come from list_assets; project ids from list_projects. use_reference_images defaults to false: the reference images are just a cover (how the output looks) unless the user turned that on — never use covers as generation references when it is false. When color_codes is set, generate using exactly that palette.
3. When you finish a batch, report briefly: how many drafts were created, their titles/topics, and that they are waiting for my review in PostGen. Never claim a post is "published" — only I can do that, from the app.
4. If a call fails, read the error, fix the cause, and tell me briefly what happened — never silently drop a failed draft.

That is everything you need. Connect now, show me my projects (names only), and wait for me to tell you what to write.`
}
