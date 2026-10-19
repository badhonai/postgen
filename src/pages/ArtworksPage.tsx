import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useProjects } from '../features/projects/api'
import { useDeletePost, usePosts, useSavePost, type PostListItem } from '../features/posts/api'
import AssetPickerDialog from '../features/media/AssetPickerDialog'
import MediaUploader from '../features/media/MediaUploader'
import { getSignedUrl, useAssetUrl } from '../lib/media'
import { useAllAssetsByProject } from '../features/prompts/api'
import { sha256Hex } from '../lib/text'
import type { Asset } from '../lib/types'
import { Button, ErrorBox, Input, Select, Skeleton } from '../components/ui'

/**
 * Artworks gallery.
 *
 * The whole point of this page: get creative images IN, in bulk, and get
 * them back OUT just as easily. Upload many at once (or pick from the
 * project library) and each image immediately becomes an artwork. Every
 * card downloads in one click; after a download the user is asked
 * whether to delete the gallery copy or keep it. Agents do the same
 * through the API (upload asset, create a post with type "artwork").
 *
 * Artworks are not posts: no Post on X, no approve/publish flow — just
 * Save / Download / Delete.
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

  const [pickerOpen, setPickerOpen] = useState(false)
  const [tab, setTab] = useState<'artwork' | 'creative'>('artwork')
  const [aiCount, setAiCount] = useState(10)
  const [addKind, setAddKind] = useState<'artwork' | 'character'>('artwork')
  const allAssets = useAllAssetsByProject()
  const [filterProject, setFilterProject] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [adding, setAdding] = useState(0)
  const [downloaded, setDownloaded] = useState<PostListItem | null>(null)
  const addingRef = useRef(0)

  const artworks = useMemo(() => artworksQuery.data ?? [], [artworksQuery.data])
  const kindOf = (a: PostListItem): 'artwork' | 'character' | 'creative' =>
    a.meta?.artwork_kind === 'creative'
      ? 'creative'
      : a.meta?.artwork_kind === 'character'
        ? 'character'
        : 'artwork'
  const isCharacter = (a: PostListItem) => kindOf(a) === 'character'
  const isCreative = (a: PostListItem) => kindOf(a) === 'creative'
  const creativeCount = useMemo(() => artworks.filter(isCreative).length, [artworks])
  const artworkTabCount = artworks.length - creativeCount
  /** This project's permanent character references — AI source material, never deleted. */
  const characters = useMemo(
    () => artworks.filter((a) => a.project_id === activeProjectId && isCharacter(a)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [artworks, activeProjectId],
  )

  /** The project's transparent logo — the mark used by AI generation. */
  const markAsset = useMemo(() => {
    const group = (allAssets.data ?? []).find((g) => g.projectId === activeProjectId)
    const assets = group?.assets ?? []
    return (
      assets.find((a) => a.kind === 'logo' || a.kind === 'logo_icon') ??
      assets.find((a) => a.kind === 'logo_transparent_name') ??
      assets.find((a) => a.kind === 'logo_full') ??
      null
    )
  }, [allAssets.data, activeProjectId])

  const activeProjectName = projectList.find((x) => x.id === activeProjectId)?.name ?? 'this project'
  const aiBrief =
    tab === 'artwork'
      ? `This is my character for ${activeProjectName}: ${characters.length > 0 ? characters.map((c) => `"${c.title || 'Character'}" (artwork ${c.id})`).join(', ') : 'the character reference(s) stored in this project'}. Attach the character reference image(s) as the generation reference and keep the character faithful (same face, outfit, colors and style). Make ${aiCount} UNIQUE images with my character: different scenes, poses, moods and compositions, every image clearly the same character. Save EACH image in PostGen Artworks as an artwork (post type "artwork", no artwork_kind meta) for project ${activeProjectId}. Never delete or replace the character reference(s).`
      : `Make creative images for ${activeProjectName}. The user does not upload anything: use the project's own logo asset${markAsset ? ` (asset ${markAsset.id}, file "${markAsset.filename}", kind "${markAsset.kind}")` : ''} and attach it as the generation reference. Prefer the project transparent logo; if no transparent logo exists, use the transparent logo with name instead. Create ANY creative 1:1 AI image with the project logo on something in the scene (a sign, wall, product, flag, jersey, sticker, screen), the logo placed naturally on the object, never as a corner watermark. Save EACH image in PostGen Artworks as a creative image (post type "artwork", meta artwork_kind "creative") for project ${activeProjectId}.`

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(aiBrief)
      setNotice('AI brief copied. Give it to your AI agent, the result lands back in this gallery.')
    } catch {
      setNotice('Could not copy automatically. Select the brief text and copy it manually.')
    }
  }
  const projectName = useMemo(() => {
    const map = new Map(projectList.map((p) => [p.id, p.name]))
    return (id: string) => map.get(id) ?? 'Project'
  }, [projectList])

  /** Projects that have creative images — the Creative tab filter chips. */
  const filterProjects = useMemo(() => {
    const ids = [...new Set(artworks.filter(isCreative).map((a) => a.project_id))]
    const known = projectList.filter((p) => ids.includes(p.id))
    const knownIds = new Set(known.map((p) => p.id))
    const extra = ids.filter((id) => !knownIds.has(id)).map((id) => ({ id, name: projectName(id) }) as (typeof projectList)[number])
    return [...known, ...extra]
  }, [artworks, projectList, projectName])
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return artworks.filter((a) => {
      if (tab === 'creative' ? !isCreative(a) : isCreative(a)) return false
      if (tab === 'creative' && filterProject !== 'all' && a.project_id !== filterProject) return false
      if (!q) return true
      return [a.title, a.content_text, projectName(a.project_id)].some((v) =>
        (v ?? '').toLowerCase().includes(q),
      )
    })
  }, [artworks, projectName, search, filterProject, tab])

  const grouped = useMemo(() => {
    const groups = new Map<string, PostListItem[]>()
    for (const artwork of filtered) {
      const list = groups.get(artwork.project_id) ?? []
      list.push(artwork)
      groups.set(artwork.project_id, list)
    }
    const ordered = projectList
      .map((p) => [p.id, groups.get(p.id)] as const)
      .filter((entry): entry is readonly [string, PostListItem[]] => !!entry[1]?.length)
    const known = new Set(ordered.map(([id]) => id))
    for (const [id, list] of groups) if (!known.has(id)) ordered.push([id, list] as const)
    return ordered
  }, [filtered, projectList])

  const effectiveAddKind = tab === 'creative' ? 'creative' : addKind

  /** One uploaded/picked image becomes one gallery item, right away. */
  const addArtwork = async (asset: Asset) => {
    if (!activeProjectId) return
    // A readable title from the filename ("retium_art1_rise.png" →
    // "retium art1 rise"). It doubles as the caption anchor text so the
    // image stays attached even before the caption-optional migration.
    const title =
      asset.filename
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim() || 'Untitled artwork'
    addingRef.current += 1
    setAdding(addingRef.current)
    try {
      await savePost.mutateAsync({
        projectId: activeProjectId,
        type: 'artwork',
        category: 'promotional',
        status: 'draft',
        title,
        tweets: [title],
        tagNames: [],
        contentText: title,
        contentHash: await sha256Hex(title),
        media: [{ tweetIndex: 0, asset }],
        meta: effectiveAddKind === 'artwork' ? {} : { artwork_kind: effectiveAddKind },
      })
      setNotice(`Added "${title}" to ${projectName(activeProjectId)} as ${effectiveAddKind === 'character' ? 'a character (kept permanently)' : effectiveAddKind === 'creative' ? 'a creative image' : 'an artwork'}.`)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not add that image as an artwork.')
    } finally {
      addingRef.current -= 1
      setAdding(addingRef.current)
    }
  }

  /** One click → the file downloads; then ask Delete or Cancel. */
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
      if (isCharacter(artwork)) {
        // Character references are the AI's source material: kept forever,
        // never auto-deleted and no delete-after-download popup.
        setNotice('Downloaded. Character references are kept and never auto-deleted.')
        return
      }
      // Give the browser a beat to hand the file over, then ask.
      window.setTimeout(() => setDownloaded(artwork), 600)
    } catch {
      setNotice('Could not download that image.')
    }
  }

  const remove = async (artwork: PostListItem) => {
    const label = artwork.title || artwork.content_text || 'this artwork'
    const warning = isCharacter(artwork)
      ? `Delete the character reference "${label}"? The AI uses it to make new artworks, and this cannot be undone.`
      : `Delete "${label}"? This cannot be undone.`
    if (!window.confirm(warning)) return
    try {
      await deletePost.mutateAsync(artwork.id)
      setNotice('Artwork deleted.')
    } catch {
      setNotice('Could not delete that artwork.')
    }
  }

  /** Popup answer: delete the gallery copy after a successful download. */
  const deleteDownloaded = async () => {
    if (!downloaded) return
    const target = downloaded
    setDownloaded(null)
    try {
      await deletePost.mutateAsync(target.id)
      setNotice('Downloaded and deleted from the gallery.')
    } catch {
      setNotice('Downloaded, but the gallery copy could not be deleted.')
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
            <h1 className="pg-title text-2xl text-ink">Artworks</h1>
            <p className="text-xs font-bold text-ink-soft">
              Characters make artworks. Logos make creatives.
            </p>
          </div>
          <span className="pg-glass shrink-0 rounded-full px-3 py-2 text-xs font-extrabold text-ink">
            {artworks.length} images
          </span>
        </header>

        {/* ── The only 2 tabs: Artworks and Creative images ── */}
        <div className="pg-glass-strong mt-5 flex gap-1 rounded-full p-1" role="tablist" aria-label="Artwork sections">
          {([
            ['artwork', `Artworks (${artworkTabCount})`],
            ['creative', `Creative images (${creativeCount})`],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded-full px-2 py-2.5 text-[12.5px] font-extrabold transition ${
                tab === k ? 'bg-ink text-white' : 'text-ink-soft'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Bulk upload: every image becomes an artwork immediately ── */}
        <section className="pg-glass-strong mt-5 rounded-[26px] p-4">
          <h2 className="pg-title text-lg text-ink">{tab === 'creative' ? 'Add creative images' : 'Add artworks'}</h2>
          <label className="mt-3.5 block">
            <span className="mb-1.5 block text-xs font-extrabold text-ink-soft">Upload into project</span>
            <Select value={activeProjectId} onChange={(e) => setProjectId(e.target.value)}>
              {projectList.length === 0 ? <option value="">No projects yet</option> : null}
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </label>

          {tab === 'artwork' ? (
          <div className="pg-glass mt-3.5 flex gap-1 rounded-full p-1" role="group" aria-label="Add images as">
            {(['artwork', 'character'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setAddKind(k)}
                className={`flex-1 rounded-full px-2 py-2 text-[12px] font-extrabold capitalize transition ${
                  addKind === k ? 'bg-ink text-white' : 'text-ink-soft'
                }`}
              >
                Add as {k}
              </button>
            ))}
          </div>
          ) : null}
          <p className="mt-1.5 text-center text-[11px] font-bold text-ink-soft">
            {tab === 'creative'
              ? 'Uploads here become creative images for this project.'
              : addKind === 'character'
                ? 'Characters are permanent: the AI reuses them to make new artworks. Never deleted.'
                : 'Artworks are finished pieces you keep, download and caption.'}
          </p>

          <div className="mt-3">
            {activeProjectId ? (
              <MediaUploader
                key={activeProjectId}
                projectId={activeProjectId}
                onUploaded={(asset) => void addArtwork(asset)}
              />
            ) : (
              <p className="text-sm font-semibold text-ink-soft">Create a project first, then upload.</p>
            )}
          </div>

          <Button
            variant="ghost"
            className="mt-3 w-full py-2.5"
            disabled={!activeProjectId}
            onClick={() => setPickerOpen(true)}
          >
            Or pick from this project's library
          </Button>

          {adding > 0 ? (
            <p className="mt-2.5 text-center text-xs font-extrabold text-ink">
              Adding {adding} image{adding === 1 ? '' : 's'} to the gallery…
            </p>
          ) : (
            <p className="mt-2.5 text-center text-[11px] font-bold text-ink-soft">
              Drop as many images as you like — each one lands in the gallery below.
              Tap any artwork later to add a caption.
            </p>
          )}
        </section>

        {/* ── Create with AI: the brief follows the active tab ── */}
        <section className="pg-glass-strong mt-4 rounded-[26px] p-4">
          <h2 className="pg-title text-lg text-ink">Create with AI</h2>
          <p className="mt-1 text-[12px] font-semibold text-ink-soft">
            {tab === 'artwork' ? (
              <>
                Tell the AI to reuse <strong className="text-ink">{activeProjectName}</strong>'s character.
                It makes new unique artworks and adds them here. You upload nothing new.
              </>
            ) : (
              <>
                Tell the AI to make creative images for <strong className="text-ink">{activeProjectName}</strong>.
                You upload nothing: the AI uses the project's own logo.
              </>
            )}
          </p>
          <p className="mt-2.5 text-[12px] leading-relaxed font-semibold text-ink-soft">
            Copy the brief below and give it to your AI agent. Results come back into this tab.
          </p>
          {tab === 'creative' ? (
            markAsset ? (
              <p className="mt-2 rounded-[14px] bg-white/55 px-3 py-2 text-[12px] font-bold text-ink">
                Logo the AI will use: {markAsset.filename}{' '}
                <span className="text-ink-soft">
                  ({markAsset.kind === 'logo_transparent_name' ? 'transparent logo + name' : 'transparent logo'})
                </span>
              </p>
            ) : (
              <p className="mt-2 rounded-[14px] bg-rose-soft/70 px-3 py-2 text-[12px] font-bold text-rose-700">
                No logo asset in this project yet. Add a transparent logo (or transparent logo + name) to the project assets so the AI can use the real logo.
              </p>
            )
          ) : null}
          {tab === 'artwork' ? (
            characters.length > 0 ? (
              <div className="mt-2">
                <p className="rounded-[14px] bg-white/55 px-3 py-2 text-[12px] font-bold text-ink">
                  Character: {characters.map((c) => c.title || 'Untitled').join(', ')}
                  <span className="text-ink-soft"> (kept permanently, never deleted)</span>
                </p>
                <label className="mt-2.5 flex items-center gap-2 text-[12px] font-extrabold text-ink-soft">
                  How many unique images?
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={aiCount}
                    onChange={(e) => setAiCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                    className="w-20 rounded-full bg-white/60 px-3 py-1.5 text-center text-[12px] font-extrabold text-ink"
                  />
                </label>
              </div>
            ) : (
              <p className="mt-2 rounded-[14px] bg-rose-soft/70 px-3 py-2 text-[12px] font-bold text-rose-700">
                No character reference in this project yet. Upload one above with Add as: Character first, then the AI can reuse it.
              </p>
            )
          ) : null}
          <div className="mt-3 max-h-32 overflow-y-auto rounded-[16px] bg-white/45 p-3 text-[12px] leading-relaxed font-semibold text-ink-soft select-text">
            {aiBrief}
          </div>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1 py-2.5" disabled={!activeProjectId} onClick={() => void copyBrief()}>
              Copy AI brief
            </Button>
            <Button variant="ghost" className="flex-1 py-2.5" onClick={() => navigate('/prompts')}>
              Prompt library
            </Button>
          </div>
        </section>

        {/* ── Gallery, grouped by project ── */}
        <div className="mt-6">
          <h2 className="pg-title text-lg text-ink">{tab === 'creative' ? 'Creative images' : 'Your artworks'}</h2>
          {tab === 'creative' && filterProjects.length > 1 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Filter by project">
              <button
                type="button"
                onClick={() => setFilterProject('all')}
                className={
                  filterProject === 'all'
                    ? 'rounded-full bg-ink px-3 py-1.5 text-[12px] font-bold text-white transition active:scale-95'
                    : 'pg-glass rounded-full px-3 py-1.5 text-[12px] font-bold text-ink transition active:scale-95'
                }
              >
                All projects ({creativeCount})
              </button>
              {filterProjects.map((fp) => {
                const count = artworks.filter((a) => a.project_id === fp.id && isCreative(a)).length
                return (
                  <button
                    key={fp.id}
                    type="button"
                    onClick={() => setFilterProject(fp.id)}
                    className={
                      filterProject === fp.id
                        ? 'rounded-full bg-ink px-3 py-1.5 text-[12px] font-bold text-white transition active:scale-95'
                        : 'pg-glass rounded-full px-3 py-1.5 text-[12px] font-bold text-ink transition active:scale-95'
                    }
                  >
                    {fp.name} ({count})
                  </button>
                )
              })}
            </div>
          ) : null}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'creative' ? 'Search creative images…' : 'Search artworks…'}
            className="mt-2.5 py-2.5 text-[13px]"
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
              {search || (tab === 'creative' && filterProject !== 'all')
                ? 'Nothing matches that filter.'
                : tab === 'creative'
                  ? 'No creative images yet. Ask the AI to make some, or upload above.'
                  : 'No artworks yet. Upload a character or artworks above.'}
            </p>
          </div>
        ) : (
          grouped.map(([pid, list]) => (
            <section key={pid} className="mt-5">
              <div className="flex items-center gap-2 px-1">
                <h3 className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-ink">
                  {projectName(pid)}
                </h3>
                <span className="shrink-0 text-[12px] font-bold text-ink-soft">
                  {list.length} image{list.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                {list.map((artwork) => (
                  <article key={artwork.id} className="pg-glass-strong pg-cv overflow-hidden rounded-[20px]">
                    <Link to={`/posts/${artwork.id}?from=artwork`} className="block">
                      <div className="relative">
                        <ArtworkCover artwork={artwork} />
                        {isCharacter(artwork) ? (
                          <span className="absolute top-2 left-2 rounded-full bg-violet-600/90 px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-white uppercase">
                            Character · Keep
                          </span>
                        ) : null}
                      </div>
                      <div className="p-2.5 pb-1.5">
                        <p className="truncate text-[13px] font-bold text-ink">
                          {artwork.title || artwork.content_text || 'Untitled artwork'}
                        </p>
                        <p className="mt-0.5 line-clamp-2 min-h-8 text-[11px] leading-snug font-semibold text-ink-soft">
                          {artwork.content_text && artwork.content_text !== artwork.title
                            ? artwork.content_text
                            : 'Tap to add a caption'}
                        </p>
                      </div>
                    </Link>
                    <div className="flex gap-1.5 px-2.5 pb-2.5">
                      <button
                        type="button"
                        disabled={!artwork.cover}
                        onClick={() => void download(artwork)}
                        className="flex-1 rounded-full bg-ink px-2 py-2 text-[11px] font-bold text-white transition active:scale-95 disabled:opacity-40"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        disabled={deletePost.isPending}
                        onClick={() => void remove(artwork)}
                        className="flex-1 rounded-full border border-rose-300/70 bg-rose-soft/60 px-2 py-2 text-[11px] font-bold text-rose-700 transition active:scale-95 disabled:opacity-40"
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

      {/* ── after a download: keep it or delete it ── */}
      {downloaded ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/45 px-3 pt-10 pb-6" onClick={() => setDownloaded(null)}>
          <div
            className="pg-glass-strong mx-auto w-full max-w-[440px] rounded-[26px] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="pg-title text-xl text-ink">Did it download?</h2>
            <p className="mt-1.5 text-sm leading-relaxed font-semibold text-ink-soft">
              <strong className="text-ink">{downloaded.title || 'This artwork'}</strong> was sent to your
              device. If you have it saved, you can delete the gallery copy now — or keep it here.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="danger"
                className="flex-1 py-3"
                disabled={deletePost.isPending}
                onClick={() => void deleteDownloaded()}
              >
                {deletePost.isPending ? 'Deleting…' : 'Delete'}
              </Button>
              <Button variant="ghost" className="flex-1 py-3" onClick={() => setDownloaded(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {pickerOpen && activeProjectId ? (
        <AssetPickerDialog
          projectId={activeProjectId}
          onSelect={(picked) => void addArtwork(picked)}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </main>
  )
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
