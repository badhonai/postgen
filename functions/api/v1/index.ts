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
                required: ['project_id', 'tweets'],
                properties: {
                  project_id: { type: 'string' },
                  title: { type: 'string' },
                  category: {
                    type: 'string',
                    enum: ['promotional', 'educational', 'announcement', 'other'],
                  },
                  status: { type: 'string', enum: ['idea', 'draft'] },
                  tweets: { type: 'array', items: { type: 'string' } },
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
    '/assets': {
      get: {
        summary: 'List my media (optionally ?project_id=…&kind=logo_transparent_name) with short-lived signed URLs',
        responses: { '200': { description: 'Assets' } },
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
