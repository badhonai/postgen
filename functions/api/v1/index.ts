import type { Env } from '../../_lib/env'

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'PostGen Agent API',
    version: '1.0.0',
    description:
      'Private post studio for web3 projects. Agents authenticate with an API key and can ' +
      'create/update DRAFTS only — a human approves/publishes in the web app. ' +
      'All writes run the no-repeat guard (409 on duplicates unless "allow_similar": true).',
  },
  servers: [{ url: '/api/v1' }],
  security: [{ bearerAuth: [] }],
  paths: {
    '/projects': {
      get: { summary: 'List my projects (lite: id, name, x_username, post_count)', responses: { '200': { description: 'Projects' } } },
      post: {
        summary: 'Create a project',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  brand_voice: {
                    type: 'object',
                    description: 'tone, blacklist[]',
                  },
                  x_username: { type: 'string' },
                  website_url: { type: 'string' },
                  content_pillars: { type: 'array', items: { type: 'string' } },
                  sample_posts: { type: 'array', items: { type: 'string' } },
                  custom_instructions: { type: 'string' },
                  official_links: {
                    type: 'array',
                    items: { type: 'object', properties: { label: { type: 'string' }, url: { type: 'string' } } },
                  },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/projects/{id}': {
      get: {
        summary: 'Project in full: profile, knowledge, char_limit (280/25000) & brand_logo',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Project' }, '404': { description: 'Not found' } },
      },
      patch: {
        summary: 'Update name / description / brand_voice / profile fields',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated' } },
      },
    },
    '/posts': {
      get: {
        summary: 'List posts',
        parameters: [
          { name: 'project_id', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Posts' } },
      },
      post: {
        summary: 'Create a DRAFT post (no-repeat checked)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_id'],
                properties: {
                  project_id: { type: 'string' },
                  title: { type: 'string' },
                  category: {
                    type: 'string',
                    enum: ['promotional', 'educational', 'announcement', 'other'],
                  },
                  status: { type: 'string', enum: ['idea', 'draft'] },
                  type: {
                    type: 'string',
                    enum: ['post', 'thread', 'article', 'artwork', 'quote'],
                    description: 'For artwork, tweets is one optional caption and may be omitted or [""].',
                  },
                  tweets: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Content blocks. Required except for captionless artwork.',
                  },
                  media: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        asset_id: { type: 'string' },
                        tweet_position: { type: 'integer', minimum: 1 },
                      },
                      required: ['asset_id'],
                    },
                  },
                  tag_names: { type: 'array', items: { type: 'string' } },
                  allow_similar: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Draft created' },
          '403': { description: 'agents_drafts_only, or blacklisted terms in the post' },
          '409': { description: 'duplicate / similar (no-repeat guard)' },
        },
      },
    },
    '/posts/{id}': {
      get: {
        summary: 'Post with thread tweets',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Post' } },
      },
      patch: {
        summary: 'Update a DRAFT (no-repeat checked)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated' }, '409': { description: 'Repeat detected' } },
      },
    },
    '/posts/{id}/append': {
      post: {
        summary: 'Append tweets to a thread',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated thread' } },
      },
    },
    '/knowledge': {
      post: {
        summary: 'Add knowledge or a source to a project',
        responses: { '201': { description: 'Created' } },
      },
    },
    '/assets/upload': {
      post: {
        summary: 'Upload media (multipart: file, project_id) → project asset',
        responses: { '201': { description: 'Asset created' } },
      },
    },
    '/assets/delete': {
      post: {
        summary: 'Delete an asset (409 while it is still attached to a post)',
        responses: { '200': { description: 'Deleted' } },
      },
    },
    '/assets': {
      get: {
        summary: 'List my media (optionally ?project_id=…&kind=logo_transparent_name) with short-lived signed URLs',
        responses: { '200': { description: 'Assets' } },
      },
    },
    '/studio/jobs': {
      get: {
        summary: 'List studio job folders (one per film) with file counts and storage used',
        responses: { '200': { description: 'Jobs' } },
      },
      post: {
        summary: 'Create a studio job folder; returns its scoped pgj_ token once',
        responses: { '201': { description: 'Job + token' } },
      },
    },
    '/studio/jobs/{id}': {
      get: { summary: 'Job folder with every file and a short-lived URL', responses: { '200': { description: 'Job + files' } } },
      patch: { summary: 'Rename a job, set a note, or change status', responses: { '200': { description: 'Updated' } } },
      delete: { summary: 'Wipe the folder (R2 objects + rows)', responses: { '200': { description: 'Deleted' } } },
    },
    '/studio/jobs/{id}/files': {
      get: { summary: 'List the folder (owner key or job token)', responses: { '200': { description: 'Files' } } },
      post: {
        summary: 'Upload one file into the folder (multipart: file, path, kind)',
        responses: { '201': { description: 'Stored' } },
      },
    },
    '/studio/jobs/{id}/files/{fileId}': {
      delete: { summary: 'Delete one file from the folder', responses: { '200': { description: 'Deleted' } } },
    },
    '/studio/jobs/{id}/contract': {
      get: {
        summary: 'The visual specialist\'s entry point: what to read, which paths may change, where to upload',
        responses: { '200': { description: 'Contract' } },
      },
    },
    '/prompts': {
      get: {
        summary: 'Saved image prompts (optionally ?project_id=… for that project + globals), each with reference images and signed URLs',
        responses: { '200': { description: 'Image prompts' } },
      },
      post: {
        summary: 'Save a new image prompt (name, prompt, notes, reference_asset_ids, project_ids — empty = global)',
        responses: { '201': { description: 'Created' } },
      },
    },
    '/prompts/{id}': {
      patch: {
        summary: 'Replace an image prompt (whole-object write)',
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        summary: 'Remove an image prompt',
        responses: { '200': { description: 'Deleted' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'API key from Settings → AI connections (pgk_live_…)',
      },
    },
  },
}

export function onRequestGet(_context: { env: Env }): Response {
  return Response.json(spec)
}
