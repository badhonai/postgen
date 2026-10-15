import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  errorMessage,
  useCreateImagePrompt,
  useDeleteImagePrompt,
  useImagePrompts,
  useUpdateImagePrompt,
  type ImagePrompt,
} from '../features/prompts/api'
import PromptCard from '../features/prompts/PromptCard'
import PromptComposerSheet, { type ComposerForm } from '../features/prompts/PromptComposerSheet'
import PromptDetailSheet from '../features/prompts/PromptDetailSheet'
import ReferenceMediaPicker from '../features/prompts/ReferenceMediaPicker'
import RefThumb from '../features/prompts/RefThumb'
import { ErrorBox, Spinner } from '../components/ui'
import ShareDialog from '../features/shares/ShareDialog'
import { useProjects } from '../features/projects/api'

const EMPTY: ComposerForm = { name: '', prompt: '', notes: '' }

export default function PromptLibraryPage() {
  const navigate = useNavigate()
  const prompts = useImagePrompts()
  const createPrompt = useCreateImagePrompt()
  const updatePrompt = useUpdateImagePrompt()
  const deletePrompt = useDeleteImagePrompt()

  const [editing, setEditing] = useState<ImagePrompt | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<ComposerForm>(EMPTY)
  const [refs, setRefs] = useState<string[]>([])
  const [promptProjects, setPromptProjects] = useState<string[]>([])
  const [useRefs, setUseRefs] = useState(false)
  const [colors, setColors] = useState<string[]>([])
  const projects = useProjects()
  const projectList = (projects.data ?? []).map((pr) => ({ id: pr.id, name: pr.name }))
  const projectName = (id: string) => projectList.find((pr) => pr.id === id)?.name ?? 'Project'
  const [picking, setPicking] = useState(false)
  const [viewing, setViewing] = useState<ImagePrompt | null>(null)
  const [sharing, setSharing] = useState<ImagePrompt | null>(null)
  /** Library filter: everything, global-only, or one project's prompts. */
  const [filter, setFilter] = useState<'all' | 'global' | string>('all')

  const closeSheet = () => setSheetOpen(false)

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY)
    setRefs([])
    setPromptProjects([])
    setUseRefs(false)
    setColors([])
    setSheetOpen(true)
  }

  const openEdit = (p: ImagePrompt) => {
    setEditing(p)
    setForm({ name: p.name, prompt: p.prompt, notes: p.notes })
    setRefs(p.reference_asset_ids ?? [])
    setPromptProjects(p.project_ids ?? [])
    setUseRefs(p.use_reference_images ?? false)
    setColors(p.color_codes ?? [])
    setViewing(null)
    setSheetOpen(true)
  }

  const save = async () => {
    if (!form.prompt.trim()) return
    const payload = {
      ...form,
      referenceAssetIds: refs,
      projectIds: promptProjects,
      useReferenceImages: useRefs,
      colorCodes: colors,
    }
    if (editing) {
      await updatePrompt.mutateAsync({ id: editing.id, ...payload })
    } else {
      await createPrompt.mutateAsync(payload)
    }
    setEditing(null)
    setForm(EMPTY)
    setRefs([])
    setPromptProjects([])
    setUseRefs(false)
    setColors([])
    closeSheet()
  }

  const remove = async (id: string) => {
    await deletePrompt.mutateAsync(id)
    setViewing(null)
    if (editing?.id === id) closeSheet()
  }

  const busy = createPrompt.isPending || updatePrompt.isPending
  const list = prompts.data?.prompts ?? []
  const globalCount = list.filter((p) => (p.project_ids ?? []).length === 0).length
  const countForProject = (id: string) => list.filter((p) => (p.project_ids ?? []).includes(id)).length
  const filterableProjects = projectList.filter((pr) => countForProject(pr.id) > 0)
  const visible =
    filter === 'all'
      ? list
      : filter === 'global'
        ? list.filter((p) => (p.project_ids ?? []).length === 0)
        : list.filter((p) => (p.project_ids ?? []).includes(filter))
  const missingTable = prompts.data?.missing === true
  // only stringify once a write has actually failed — errorMessage() falls back
  // to its default, which would otherwise render an empty error box on open
  const writeError = createPrompt.error ?? updatePrompt.error
  const sheetError = writeError ? errorMessage(writeError, 'Failed to save') : null

  return (
    <div className="pg-shell">
      <div className="mx-auto max-w-[440px] px-5 pt-6 pb-32">
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
            <h1 className="pg-title truncate text-2xl text-ink">Prompt library</h1>
            <p className="text-xs font-bold text-ink-soft">
              {list.length} saved prompt{list.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            aria-label="New prompt"
            onClick={openNew}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white shadow-[0_10px_24px_rgba(47,43,94,0.32)] transition active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </header>

        {/* ── filter by project ── */}
        {list.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter prompts by project">
            {[
              { id: 'all' as const, label: 'All', count: list.length },
              { id: 'global' as const, label: 'Global', count: globalCount },
              ...filterableProjects.map((pr) => ({ id: pr.id, label: pr.name, count: countForProject(pr.id) })),
            ].map((chip) => {
              const active = filter === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(chip.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition active:scale-95 ${
                    active ? 'bg-ink text-white shadow-[0_8px_18px_rgba(47,43,94,0.3)]' : 'bg-white/55 text-ink hover:bg-white/75'
                  }`}
                >
                  {chip.label}
                  <span className={active ? 'text-white/70' : 'text-ink-soft'}> · {chip.count}</span>
                </button>
              )
            })}
          </div>
        ) : null}

        {/* ── bento grid ── */}
        <section className="mt-6">
          {missingTable ? (
            <div className="pg-glass rounded-[22px] border border-amber-300/70 bg-amber-100/50 p-5 text-center">
              <p className="text-sm font-bold text-amber-900">The prompt library isn’t set up yet.</p>
              <p className="mx-auto mt-1.5 max-w-[280px] text-xs font-semibold text-amber-800">
                Run the <code className="font-bold">image_prompts</code> migration in Supabase and
                this page fills in — nothing else to change.
              </p>
            </div>
          ) : prompts.isPending ? (
            <Spinner />
          ) : prompts.error ? (
            <ErrorBox
              message={prompts.error instanceof Error ? prompts.error.message : 'Failed to load prompts'}
            />
          ) : list.length === 0 ? (
            <div className="pg-glass rounded-[22px] p-7 text-center">
              <p className="text-sm font-semibold text-ink-soft">No prompts yet.</p>
              <p className="mx-auto mt-1.5 max-w-[240px] text-xs font-semibold text-ink-soft">
                Tap the <span className="text-ink">+</span> button to create your first prompt and the
                agent can start using it.
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="pg-glass rounded-[22px] p-7 text-center">
              <p className="text-sm font-semibold text-ink-soft">Nothing under this filter yet.</p>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="mt-2 text-xs font-extrabold text-ink underline underline-offset-2"
              >
                Show all prompts
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 items-start gap-3.5">
              {visible.map((p, i) => (
                <PromptCard
                  key={p.id}
                  prompt={p}
                  index={i}
                  projectNames={(p.project_ids ?? []).map(projectName)}
                  onOpen={() => setViewing(p)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── detail: what a card opens ── */}
      {viewing ? (
        <PromptDetailSheet
          prompt={viewing}
          projectNames={(viewing.project_ids ?? []).map(projectName)}
          deletePending={deletePrompt.isPending}
          onClose={() => setViewing(null)}
          onEdit={() => openEdit(viewing)}
          onDelete={() => void remove(viewing.id)}
          onSend={() => {
            setSharing(viewing)
            setViewing(null)
          }}
        />
      ) : null}

      {sharing ? (
        <ShareDialog
          targets={[{ itemType: 'prompt', itemId: sharing.id, title: sharing.name }]}
          onClose={() => setSharing(null)}
        />
      ) : null}

      {/* ── create / edit ── */}
      {sheetOpen ? (
        <PromptComposerSheet
          editing={editing}
          form={form}
          refs={refs}
          projects={projectList}
          selectedProjectIds={promptProjects}
          busy={busy}
          error={sheetError}
          onChange={setForm}
          onRefs={setRefs}
          useRefs={useRefs}
          onUseRefs={setUseRefs}
          colors={colors}
          onColors={setColors}
          onProjects={setPromptProjects}
          onSave={() => void save()}
          onClose={closeSheet}
          onPick={() => setPicking(true)}
          renderThumb={(id) => <RefThumb assetId={id} />}
        />
      ) : null}

      {picking ? (
        <ReferenceMediaPicker
          selectedIds={refs}
          onChange={(ids) => {
            setRefs(ids)
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </div>
  )
}
