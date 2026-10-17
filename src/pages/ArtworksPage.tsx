import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useProjects } from '../features/projects/api'
import { useDeletePost, usePosts, useSavePost, type PostListItem } from '../features/posts/api'
import AssetPickerDialog from '../features/media/AssetPickerDialog'
import MediaUploader from '../features/media/MediaUploader'
import { getSignedUrl, useAssetUrl } from '../lib/media'
import { sha256Hex } from '../lib/text'
import type { Asset } from '../lib/types'
import { Button, ErrorBox, Input, Select, Skeleton, Textarea } from '../components/ui'

/**
 * Artworks hub.
 *
 * Artworks are media-first gallery items: an image plus an optional
 * caption. They are not tweets, so there is no Post on X button and no
 * approve/publish flow anywhere here — Save, Download image and Delete
 * are the whole action set (the editor keeps the same three).
 */
export default function ArtworksPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const projects = useProjects()
  const artworksQuery = usePosts({ type: 'artwork' })
  const savePost = useSavePost()
  const deletePost = useDeletePost()

  const projectList = useMemo(() => projects.data ?? [], [projects.data])
  const requestedProject = params.get('project') ?? ''
  const [projectId, setProjectId] = useState('')
  const activeProjectId =
    projectId ||
    (projectList.some((p) => p.id === requestedProject) ? requestedProject : '') ||
    projectList[0]?.id ||
    ''

  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [asset, setAsset] = useState<Asset | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [uploaderOpen, setUploaderOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const artworks = useMemo(() => artworksQuery.data ?? [], [artworksQuery.data])
  const projectName = useMemo(() => {
    const map = new Map(projectList.map((p) => [p.id, p.name]))
    return (id: string) => map.get(id) ?? 'Project'
  }, [projectList])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return artworks
    return artworks.filter((a) =>
      [a.title, a.content_text, projectName(a.project_id)].some((v) =>
        (v ?? '').toLowerCase().includes(q),
      ),
    )
  }, [artworks, projectName, search])

  const grouped = useMemo(() => {
    const groups = new Map<string, PostListItem[]>()
    for (const artwork of filtered) {
      const list = groups.get(artwork.project_id) ?? []
      list.push(artwork)
      groups.set(artwork.project_id, list)
    }
    // Keep the user's project order; unknown projects (shared copies) last.
    const ordered = projectList
      .map((p) => [p.id, groups.get(p.id)] as const)
      .filter((entry): entry is readonly [string, PostListItem[]] => !!entry[1]?.length)
    const known = new Set(ordered.map(([id]) => id))
    for (const [id, list] of groups) if (!known.has(id)) ordered.push([id, list] as const)
    return ordered
  }, [filtered, projectList])

  const canSave = !!activeProjectId && !!asset && !savePost.isPending

  const handleSave = async () => {
    setFormError(null)
    setNotice(null)
    if (!activeProjectId) {
      setFormError('Pick a project first.')
      return
    }
    if (!asset) {
      setFormError('Add an image first — upload one or pick an existing asset.')
      return
    }
    const cleanCaption = caption.trim()
    try {
      const id = await savePost.mutateAsync({
        projectId: activeProjectId,
        type: 'artwork',
        category: 'promotional',
        status: 'draft',
        title: title.trim(),
        tweets: [cleanCaption],
        tagNames: [],
        contentText: cleanCaption,
        contentHash: cleanCaption ? await sha256Hex(cleanCaption) : '',
        media: [{ tweetIndex: 0, asset }],
      })
      navigate(`/posts/${id}?from=artwork`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save artwork')
    }
  }

  const download = async (artwork: PostListItem) => {
    const cover = artwork.cover
    if (!cover?.r2_key) return
    try {
      const url = await getSignedUrl(cover.r2_key)
      const blob = await (await fetch(url)).blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = cover.filename || 'artwork.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
    } catch {
      setNotice('Could not download that image.')
    }
  }

  const remove = async (artwork: PostListItem) => {
    const label = artwork.title || artwork.content_text || 'this artwork'
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return
    try {
      await deletePost.mutateAsync(artwork.id)
      setNotice('Artwork deleted.')
    } catch {
      setNotice('Could not delete that artwork.')
    }
  }

  return (
    <main className="pg-shell">
      <div className="mx-auto max-w-[440px] px-5 pt-6 pb-24">
        <header className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate('/dashboard')}
            className="pg-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="pg-title truncate text-2xl text-ink">Artworks</h1>
            <p className="truncate text-xs font-bold text-ink-soft">
              Images with optional captions — no posting flow.
            </p>
          </div>
          <span className="pg-glass shrink-0 rounded-full px-3 py-2 text-xs font-extrabold text-ink">
            {artworks.length} total
          </span>
        </header>

        {/* ── Create ── */}
        <section className="pg-glass-strong mt-5 rounded-[26px] p-4">
          <h2 className="pg-title text-lg text-ink">New artwork</h2>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-extrabold text-ink-soft">Project</span>
            <Select
              value={activeProjectId}
              onChange={(e) => {
                setProjectId(e.target.value)
                setAsset(null)
              }}
            >
              {projectList.length === 0 ? <option value="">No projects yet</option> : null}
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </label>

          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-extrabold text-ink-soft">Title (optional)</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name this artwork…" />
          </label>

          <div className="mt-3">
            <span className="mb-1.5 block text-xs font-extrabold text-ink-soft">Image</span>
            {asset ? (
              <div className="overflow-hidden rounded-[20px] bg-white/40">
                <SelectedAssetPreview asset={asset} />
                <div className="flex items-center gap-2 p-2.5">
                  <p className="min-w-0 flex-1 truncate text-xs font-bold text-ink">{asset.filename}</p>
                  <button
                    type="button"
                    onClick={() => setAsset(null)}
                    className="shrink-0 rounded-full bg-white/70 px-3 py-1.5 text-xs font-bold text-ink"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 py-2.5"
                  disabled={!activeProjectId}
                  onClick={() => setUploaderOpen((v) => !v)}
                >
                  Upload image
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 py-2.5"
                  disabled={!activeProjectId}
                  onClick={() => setPickerOpen(true)}
                >
                  Pick existing
                </Button>
              </div>
            )}
            {uploaderOpen && activeProjectId && !asset ? (
              <div className="mt-3">
                <MediaUploader
                  projectId={activeProjectId}
                  onUploaded={(uploaded) => {
                    setAsset(uploaded)
                    setUploaderOpen(false)
                  }}
                />
              </div>
            ) : null}
          </div>

          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-extrabold text-ink-soft">Caption (optional)</span>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption, or leave this empty…"
              rows={3}
            />
          </label>

          {formError ? (
            <div className="mt-3">
              <ErrorBox message={formError} />
            </div>
          ) : null}
          {savePost.error && !formError ? (
            <div className="mt-3">
              <ErrorBox message={savePost.error instanceof Error ? savePost.error.message : 'Failed to save artwork'} />
            </div>
          ) : null}

          <Button className="mt-4 w-full py-3 text-[15px]" disabled={!canSave} onClick={() => void handleSave()}>
            {savePost.isPending ? 'Saving…' : 'Save artwork'}
          </Button>
          {!asset ? (
            <p className="mt-2 text-center text-[11px] font-bold text-ink-soft">
              An artwork needs an image; the caption can stay empty.
            </p>
          ) : null}
        </section>

        {/* ── Browse, grouped by project ── */}
        <div className="mt-6 flex items-center gap-2">
          <h2 className="pg-title flex-1 text-lg text-ink">Your artworks</h2>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-36 shrink-0 py-2 text-[13px]"
          />
        </div>

        {notice ? (
          <p className="mt-3 rounded-[16px] bg-white/55 px-3.5 py-2.5 text-[13px] font-bold text-ink">{notice}</p>
        ) : null}

        {projects.isPending || artworksQuery.isPending ? (
          <div className="mt-4 space-y-2.5">
            <Skeleton className="h-44 w-full rounded-[22px]" />
            <Skeleton className="h-44 w-full rounded-[22px]" />
          </div>
        ) : artworksQuery.error ? (
          <div className="mt-4">
            <ErrorBox message={artworksQuery.error instanceof Error ? artworksQuery.error.message : 'Failed to load artworks'} />
          </div>
        ) : grouped.length === 0 ? (
          <div className="pg-glass mt-4 rounded-[24px] p-7 text-center">
            <p className="text-sm font-semibold text-ink-soft">
              {search ? 'No artworks match that search.' : 'No artworks yet. Create the first one above.'}
            </p>
          </div>
        ) : (
          grouped.map(([pid, list]) => (
            <section key={pid} className="mt-5">
              <div className="flex items-center gap-2 px-1">
                <h3 className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-ink">
                  {projectName(pid)}
                </h3>
                <Link
                  to={`/projects/${pid}`}
                  className="shrink-0 text-[12px] font-bold text-ink-soft underline underline-offset-2"
                >
                  Open project
                </Link>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                {list.map((artwork) => (
                  <article key={artwork.id} className="pg-glass-strong pg-cv overflow-hidden rounded-[20px]">
                    <Link to={`/posts/${artwork.id}?from=artwork`} className="block">
                      <ArtworkCover artwork={artwork} />
                      <div className="p-2.5 pb-1.5">
                        <p className="truncate text-[13px] font-bold text-ink">
                          {artwork.title || artwork.content_text || 'Untitled artwork'}
                        </p>
                        <p className="mt-0.5 line-clamp-2 min-h-8 text-[11px] leading-snug font-semibold text-ink-soft">
                          {artwork.content_text && artwork.content_text !== artwork.title
                            ? artwork.content_text
                            : 'No caption'}
                        </p>
                      </div>
                    </Link>
                    <div className="flex gap-1.5 px-2.5 pb-2.5">
                      <button
                        type="button"
                        disabled={!artwork.cover}
                        onClick={() => void download(artwork)}
                        className="flex-1 rounded-full bg-ink px-2 py-1.5 text-[11px] font-bold text-white transition active:scale-95 disabled:opacity-40"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        disabled={deletePost.isPending}
                        onClick={() => void remove(artwork)}
                        className="flex-1 rounded-full border border-rose-300/70 bg-rose-soft/60 px-2 py-1.5 text-[11px] font-bold text-rose-700 transition active:scale-95 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {pickerOpen && activeProjectId ? (
        <AssetPickerDialog
          projectId={activeProjectId}
          onSelect={(picked) => setAsset(picked)}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </main>
  )
}

function SelectedAssetPreview({ asset }: { asset: Asset }) {
  const url = useAssetUrl(asset.r2_key)
  if (!asset.mime_type.startsWith('image/') || !url.data) {
    return (
      <div className="flex aspect-video w-full items-center justify-center text-sm font-bold text-ink-soft">
        {asset.filename}
      </div>
    )
  }
  return <img src={url.data} alt={asset.alt_text ?? asset.filename} className="aspect-video w-full object-cover" />
}

function ArtworkCover({ artwork }: { artwork: PostListItem }) {
  const url = useAssetUrl(artwork.cover?.r2_key ?? null)
  const [broken, setBroken] = useState(false)
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-white/50">
      {url.data && !broken ? (
        <img
          src={url.data}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-ink-soft/60">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <circle cx="8.5" cy="9.5" r="1.8" />
            <path d="M21 16l-5.5-5L7 20" />
          </svg>
        </div>
      )}
    </div>
  )
}
