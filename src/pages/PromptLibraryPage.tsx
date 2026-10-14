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
import ReferenceMediaPicker from '../features/prompts/ReferenceMediaPicker'
import { useAssetUrl } from '../lib/media'
import { Button, ErrorBox, Input, Spinner, Textarea } from '../components/ui'
import { cn } from '../lib/cn'

const EMPTY = { name: '', prompt: '', notes: '' }

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
  const [form, setForm] = useState(EMPTY)
  const [refs, setRefs] = useState<string[]>([])
  const [picking, setPicking] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY)
    setRefs([])
  }

  const openEdit = (p: ImagePrompt) => {
    setEditing(p)
    setForm({ name: p.name, prompt: p.prompt, notes: p.notes })
    setRefs(p.reference_asset_ids ?? [])
  }

  const save = async () => {
    if (!form.prompt.trim()) return
    const payload = { ...form, referenceAssetIds: refs }
    if (editing) {
      await updatePrompt.mutateAsync({ id: editing.id, ...payload })
    } else {
      await createPrompt.mutateAsync(payload)
      openNew()
    }
  }

  const remove = async (id: string) => {
    await deletePrompt.mutateAsync(id)
    setConfirmId(null)
    if (editing?.id === id) openNew()
  }

  const busy = createPrompt.isPending || updatePrompt.isPending
  const list = prompts.data?.prompts ?? []
  const missingTable = prompts.data?.missing === true

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
        </header>

        <p className="pg-glass mt-5 rounded-[20px] p-4 text-xs leading-relaxed font-semibold text-ink-soft">
          A prompt is a reusable recipe for art. The agent reads the prompt <em>and</em> its reference
          images, so it can match your style instead of guessing it.
        </p>

        {/* ── editor ── */}
        <section className="pg-glass mt-5 space-y-3 rounded-[22px] p-4">
          <h2 className="pg-title text-[15px] text-ink">
            {editing ? `Edit “${editing.name}”` : 'New prompt'}
          </h2>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name — e.g. Neon poster"
          />
          <Textarea
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            placeholder="The image prompt itself…"
            className="min-h-[92px]"
          />
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes — what output this tends to give (optional)"
            className="min-h-[56px]"
          />

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold tracking-[0.12em] text-ink-soft uppercase">
                Reference media · {refs.length}
              </span>
              <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setPicking(true)}>
                {refs.length ? 'Change' : 'Add'}
              </Button>
            </div>
            {refs.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {refs.map((id) => (
                  <span key={id} className="relative">
                    <RefThumb assetId={id} />
                    <button
                      type="button"
                      aria-label="Remove reference"
                      onClick={() => setRefs(refs.filter((x) => x !== id))}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-[11px] font-semibold text-ink-soft">
                None yet — references teach the style.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            {editing ? (
              <Button variant="ghost" onClick={openNew}>
                Cancel
              </Button>
            ) : null}
            <Button className="ml-auto" disabled={busy || !form.prompt.trim()} onClick={() => void save()}>
              {busy ? '…' : editing ? 'Save changes' : 'Create prompt'}
            </Button>
          </div>
          {createPrompt.error || updatePrompt.error ? (
            <ErrorBox message={errorMessage(createPrompt.error ?? updatePrompt.error, 'Failed to save')} />
          ) : null}
        </section>

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
                Create one above and the agent can start using it.
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
