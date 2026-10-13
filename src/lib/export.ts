import { supabase } from './supabase'
import { sha256Hex, threadToContentText } from './text'
import type { SavePostInput } from '../features/posts/api'
import type { PostCategory, PostStatus } from './types'

export type ExportTweet = string[]
export type ExportPost = {
  title: string
  category: PostCategory
  status: PostStatus
  created_via: string
  tweets: string[]
  tags: string[]
  created_at: string
}
export type ExportBundle = {
  app: 'postgen'
  version: 1
  exported_at: string
  project: { name: string; slug: string; description: string | null }
  posts: ExportPost[]
}

async function fetchProjectBundle(projectId: string): Promise<ExportBundle> {
  const supa = supabase!
  const { data: project, error: pErr } = await supa
    .from('projects')
    .select('name, slug, description')
    .eq('id', projectId)
    .single()
  if (pErr) throw pErr

  const { data: rows, error } = await supa
    .from('posts')
    .select('title, category, status, created_via, created_at, content_text, post_tweets(position, content), post_tags(tags(name))')
    .eq('project_id', projectId)
    .order('created_at')
  if (error) throw error

  const posts: ExportPost[] = (rows ?? []).map((raw) => {
    const row = raw as unknown as {
      title: string
      category: PostCategory
      status: PostStatus
      created_via: string
      created_at: string
      post_tweets: Array<{ position: number; content: string }>
      post_tags: Array<{ tags: { name: string } | null }>
    }
    return {
      title: row.title,
      category: row.category,
      status: row.status,
      created_via: row.created_via,
      tweets: [...row.post_tweets]
        .sort((a, b) => a.position - b.position)
        .map((t) => t.content),
      tags: row.post_tags.map((pt) => pt.tags?.name).filter((n): n is string => !!n),
      created_at: row.created_at,
    }
  })

  return {
    app: 'postgen',
    version: 1,
    exported_at: new Date().toISOString(),
    project: { name: project.name, slug: project.slug, description: project.description },
    posts,
  }
}

export function bundleToMarkdown(bundle: ExportBundle): string {
  const lines: string[] = [
    `# ${bundle.project.name} — PostGen export`,
    '',
    `Exported ${bundle.exported_at} · ${bundle.posts.length} posts`,
    '',
  ]
  for (const post of bundle.posts) {
    lines.push(`## ${post.title || 'Untitled post'}`)
    lines.push('')
    lines.push(`*${post.status} · ${post.category}${post.tags.length ? ` · ${post.tags.map((t) => '#' + t).join(' ')}` : ''} · via ${post.created_via}*`)
    lines.push('')
    const n = post.tweets.length
    post.tweets.forEach((t, i) => {
      lines.push(`**${i + 1}/${n}**`)
      lines.push('')
      lines.push(t)
      lines.push('')
    })
    lines.push('---')
    lines.push('')
  }
  return lines.join('\n')
}

function download(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportProject(projectId: string, slug: string, format: 'json' | 'md'): Promise<void> {
  const bundle = await fetchProjectBundle(projectId)
  if (format === 'json') {
    download(`postgen-${slug}.json`, JSON.stringify(bundle, null, 2), 'application/json')
  } else {
    download(`postgen-${slug}.md`, bundleToMarkdown(bundle), 'text/markdown')
  }
}

export type ImportResult = {
  imported: number
  skippedDuplicates: number
  failed: number
  messages: string[]
}

export function parseImportJson(text: string): ExportBundle {
  const parsed = JSON.parse(text) as Partial<ExportBundle>
  if (parsed.app !== 'postgen' || !Array.isArray(parsed.posts)) {
    throw new Error('Not a PostGen export file')
  }
  return parsed as ExportBundle
}

/**
 * Restores exported posts into a project. Exact duplicates are skipped;
 * near-duplicates are imported as intentional variants (allow_similar).
 */
export async function importBundle(
  bundle: ExportBundle,
  projectId: string,
  save: (input: SavePostInput) => Promise<unknown>,
  isExactDuplicate: (hash: string) => Promise<boolean>,
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skippedDuplicates: 0, failed: 0, messages: [] }

  for (const post of bundle.posts) {
    const tweets = post.tweets.map((t) => t.trim()).filter(Boolean)
    if (tweets.length === 0) {
      result.failed += 1
      continue
    }
    const contentText = threadToContentText(tweets)
    const contentHash = await sha256Hex(contentText)

    if (await isExactDuplicate(contentHash)) {
      result.skippedDuplicates += 1
      continue
    }

    try {
      await save({
        projectId,
        category: post.category,
        status: post.status,
        title: post.title,
        tweets,
        tagNames: post.tags,
        contentText,
        contentHash,
        media: [],
        createdVia: (post.created_via as 'web' | 'api' | 'mcp') ?? 'web',
      })
      result.imported += 1
    } catch {
      result.failed += 1
      result.messages.push(`Failed: ${post.title || 'Untitled'}`)
    }
  }

  return result
}
