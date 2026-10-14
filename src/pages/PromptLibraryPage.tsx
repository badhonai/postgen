import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  errorMessage,
  useAllAssetsByProject,
  useCreateImagePrompt,
  useDeleteImagePrompt,
  useImagePrompts,
  useUpdateImagePrompt,
  type ImagePrompt,
} from '../features/prompts/api'
import PromptComposerSheet, { type ComposerForm } from '../features/prompts/PromptComposerSheet'
import ReferenceMediaPicker from '../features/prompts/ReferenceMediaPicker'
import { useAssetUrl } from '../lib/media'
import { Button, ErrorBox, Spinner } from '../components/ui'
import { cn } from '../lib/cn'

const EMPTY: ComposerForm = { name: '', prompt: '', notes: '' }

function RefThumb({ assetId }: { assetId: string }) {
  const groups = useAllAssetsByProject()
  const asset = (groups.data ?? [])
    .flatMap((g) => g.assets)
    .find((a) => a.id === assetId)
  const urlQuery = useAssetUrl(asset?.r2_key)
  if (!asset) return null
  return (
    <img
      src={urlQuery.data ?? ''}
      alt={asset.alt_text || asset.filename}
      className="h-12 w-12 rounded-[10px] object-cover"
      loading="lazy"
    />
  )
}

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
  const [picking, setPicking] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const closeSheet = () => setSheetOpen(false)

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY)
    setRefs([])
    setSheetOpen(true)
  }

  const openEdit = (p: ImagePrompt) => {
    setEditing(p)
    setForm({ name: p.name, prompt: p.prompt, notes: p.notes })
    setRefs(p.reference_asset_ids ?? [])
    setSheetOpen(true)
  }

  const save = async () => {
    if (!form.prompt.trim()) return
    const payload = { ...form, referenceAssetIds: refs }
    if (editing) {
      await updatePrompt.mutateAsync({ id: editing.id, ...payload })
    } else {
      await createPrompt.mutateAsync(payload)
    }
    setEditing(null)
    setForm(EMPTY)
    setRefs([])
    closeSheet()
  }

  const remove = async (id: string) => {
    await deletePrompt.mutateAsync(id)
    setConfirmId(null)
    if (editing?.id === id) closeSheet()
  }

  const busy = createPrompt.isPending || updatePrompt.isPending
  const list = prompts.data?.prompts ?? []
  const missingTable = prompts.data?.missing === true
  const sheetError = errorMessage(createPrompt.error ?? updatePrompt.error, 'Failed to save')

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

        <p className="pg-glass mt-5 rounded-[20px] p-4 text-xs leading-relaxed font-semibold text-ink-soft">
          A prompt is a reusable recipe for art. The agent reads the prompt <em>and</em> its reference
          images, so it can match your style instead of guessing it.
        </p>

        {/* ── list ── */}
        <section className="mt-6 space-y-3">
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
          ) : (
            list.map((p) => (
              <article
                key={p.id}
                className={cn(
                  'pg-glass rounded-[22px] p-4',
                  editing?.id === p.id ? 'ring-2 ring-butter' : '',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="pg-title text-[15px] text-ink">{p.name}</h3>
                    <p className="mt-0.5 text-[11px] font-bold text-ink-soft">
                      {(p.reference_asset_ids ?? []).length} reference
                      {(p.reference_asset_ids ?? []).length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => openEdit(p)}>
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      className="px-2.5 py-1 text-xs"
                      onClick={() => setConfirmId(p.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <p className="mt-2.5 text-sm leading-relaxed font-semibold whitespace-pre-wrap text-ink">
                  {p.prompt}
                </p>
                {p.notes ? (
                  <p className="mt-2 text-xs leading-relaxed font-semibold text-ink-soft">
                    {p.notes}
                  </p>
                ) : null}

                {(p.reference_asset_ids ?? []).length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {(p.reference_asset_ids ?? []).map((id) => (
                      <RefThumb key={id} assetId={id} />
                    ))}
                  </div>
                ) : null}

                {confirmId === p.id ? (
                  <div className="mt-3 flex items-center gap-2 rounded-[16px] bg-rose-soft/60 p-2.5">
                    <p className="text-xs font-bold text-rose-700">Delete this prompt?</p>
                    <Button
                      variant="ghost"
                      className="ml-auto px-2 py-1 text-xs"
                      onClick={() => setConfirmId(null)}
                    >
                      Keep
                    </Button>
                    <Button
                      variant="danger"
                      className="px-2.5 py-1 text-xs"
                      disabled={deletePrompt.isPending}
                      onClick={() => void remove(p.id)}
                    >
                      {deletePrompt.isPending ? '…' : 'Delete'}
                    </Button>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </section>
      </div>

      {sheetOpen ? (
        <PromptComposerSheet
          editing={editing}
          form={form}
          refs={refs}
          busy={busy}
          error={sheetError}
          onChange={setForm}
          onRefs={setRefs}
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
