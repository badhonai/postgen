import { useState } from 'react'
import { normalizeHex, type ImagePrompt } from './api'
import { Button, Input, Textarea } from '../../components/ui'

const EMPTY = { name: '', prompt: '', notes: '' }

export type ComposerForm = typeof EMPTY

type Props = {
  /** Prompt being edited, or null for a brand-new one. */
  editing: ImagePrompt | null
  form: ComposerForm
  refs: string[]
  /** Projects this prompt is for; empty = global (any project). */
  projects: Array<{ id: string; name: string }>
  selectedProjectIds: string[]
  busy: boolean
  error: string | null
  onChange: (form: ComposerForm) => void
  onRefs: (ids: string[]) => void
  /** May the cover images be used as generation references? (default off) */
  useRefs: boolean
  onUseRefs: (v: boolean) => void
  /** Optional hex palette the generated image must use. */
  colors: string[]
  onColors: (codes: string[]) => void
  onProjects: (ids: string[]) => void
  onSave: () => void
  onClose: () => void
  /** Opens the reference-media picker. */
  onPick: () => void
  /** Renders one reference thumbnail. */
  renderThumb: (assetId: string) => React.ReactNode
}

/**
 * Bottom sheet for writing a prompt — reached from the small + in the library
 * header. Everything the composer needs lives here so the library page itself
 * stays a plain list.
 */
export default function PromptComposerSheet({
  editing,
  form,
  refs,
  projects,
  selectedProjectIds,
  busy,
  error,
  onChange,
  onRefs,
  useRefs,
  onUseRefs,
  colors,
  onColors,
  onProjects,
  onSave,
  onClose,
  onPick,
  renderThumb,
}: Props) {
  const set = (patch: Partial<ComposerForm>) => onChange({ ...form, ...patch })
  const [colorDraft, setColorDraft] = useState('')
  const [colorError, setColorError] = useState<string | null>(null)
  const addColor = () => {
    const n = normalizeHex(colorDraft)
    if (!n) {
      setColorError('Use a hex code like #FF1E2D')
      return
    }
    setColorError(null)
    setColorDraft('')
    if (!colors.includes(n) && colors.length < 12) onColors([...colors, n])
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      {/* backdrop — tap to dismiss */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/35 backdrop-blur-[2px]"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Edit prompt' : 'New prompt'}
        className="pg-glass-strong pg-scroll relative mx-auto max-h-[90dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] px-5 pt-2.5 pb-7"
        style={{ animation: 'pg-sheet-up 0.26s cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/15" />

        <div className="mt-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="pg-title text-lg text-ink">
              {editing ? `Edit “${editing.name}”` : 'New prompt'}
            </h2>
            <p className="mt-0.5 text-[11px] font-bold text-ink-soft">
              {editing ? 'Update the recipe below.' : 'Save a recipe the agent can reuse.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="pg-glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Input
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Name — e.g. Neon poster"
          />
          <Textarea
            value={form.prompt}
            onChange={(e) => set({ prompt: e.target.value })}
            placeholder="The image prompt itself…"
            className="min-h-[92px]"
          />
          <Textarea
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Notes — what output this tends to give (optional)"
            className="min-h-[56px]"
          />

          <div>
            <span className="text-[11px] font-extrabold tracking-[0.12em] text-ink-soft uppercase">
              For projects · {selectedProjectIds.length === 0 ? 'all (global)' : selectedProjectIds.length}
            </span>
            {projects.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {projects.map((proj) => {
                  const on = selectedProjectIds.includes(proj.id)
                  return (
                    <button
                      key={proj.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        onProjects(
                          on
                            ? selectedProjectIds.filter((x) => x !== proj.id)
                            : [...selectedProjectIds, proj.id],
                        )
                      }
                      className={`rounded-full px-2.5 py-1.5 text-xs font-extrabold transition active:scale-95 ${
                        on ? 'bg-ink text-white' : 'bg-white/55 text-ink-soft hover:bg-white/75'
                      }`}
                    >
                      {proj.name}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="mt-1.5 text-[11px] font-semibold text-ink-soft">No projects yet.</p>
            )}
            <p className="mt-1.5 text-[11px] font-semibold text-ink-soft">
              The agent only gets prompts tagged for its project (plus globals). Leave all off = global.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold tracking-[0.12em] text-ink-soft uppercase">
                Cover media · {refs.length}
              </span>
              <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={onPick}>
                {refs.length ? 'Change' : 'Add'}
              </Button>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed font-semibold text-ink-soft">
              The cover shows how this prompt's output looks. It is <em>not</em> used to generate —
              unless you turn that on below.
            </p>
            {refs.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {refs.map((id) => (
                  <span key={id} className="relative">
                    {renderThumb(id)}
                    <button
                      type="button"
                      aria-label="Remove cover image"
                      onClick={() => onRefs(refs.filter((x) => x !== id))}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-[11px] font-semibold text-ink-soft">
                None yet — add an example output as the cover.
              </p>
            )}

            <button
              type="button"
              role="switch"
              aria-checked={useRefs}
              onClick={() => onUseRefs(!useRefs)}
              className="mt-3 flex w-full items-center gap-3 rounded-[16px] bg-white/45 px-3 py-2.5 text-left transition active:scale-[0.99]"
            >
              <span
                className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
                  useRefs ? 'justify-end bg-ink' : 'justify-start bg-ink/20'
                }`}
              >
                <span className="h-5 w-5 rounded-full bg-white shadow" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-extrabold text-ink">Use cover as generation reference</span>
                <span className="block text-[11px] leading-snug font-semibold text-ink-soft">
                  {useRefs
                    ? 'On — agents may feed the cover images to the image model as references.'
                    : 'Off — cover is display only; agents never use it to generate.'}
                </span>
              </span>
            </button>
          </div>

          <div>
            <span className="text-[11px] font-extrabold tracking-[0.12em] text-ink-soft uppercase">
              Color codes · {colors.length}
            </span>
            <p className="mt-1 text-[11px] leading-relaxed font-semibold text-ink-soft">
              Optional. When set, generated images must use exactly these colors.
            </p>
            {colors.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {colors.map((c) => (
                  <span
                    key={c}
                    className="flex items-center gap-1.5 rounded-full bg-white/55 py-1 pr-1.5 pl-2 text-[11px] font-extrabold text-ink"
                  >
                    <span className="h-3.5 w-3.5 rounded-full ring-1 ring-white/80" style={{ background: c }} />
                    {c}
                    <button
                      type="button"
                      aria-label={`Remove ${c}`}
                      onClick={() => onColors(colors.filter((x) => x !== c))}
                      className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-ink/8 text-[10px] text-ink-soft hover:text-ink"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-2 flex items-center gap-2">
              <span className="relative shrink-0">
                <input
                  type="color"
                  aria-label="Pick a color"
                  value={normalizeHex(colorDraft) ?? '#FF1E2D'}
                  onChange={(e) => setColorDraft(e.target.value.toUpperCase())}
                  className="h-9 w-9 cursor-pointer rounded-full border border-white/70 bg-white/60 p-1"
                />
              </span>
              <Input
                value={colorDraft}
                onChange={(e) => setColorDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addColor()
                  }
                }}
                placeholder="#FF1E2D"
                className="min-w-0 flex-1 py-2"
              />
              <Button variant="ghost" className="shrink-0 px-3 py-2 text-xs" onClick={addColor}>
                Add
              </Button>
            </div>
            {colorError ? <p className="mt-1 text-[11px] font-bold text-rose-700">{colorError}</p> : null}
          </div>

          <div className="flex items-center gap-2 pt-1">
            {editing ? (
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            ) : null}
            <Button className="ml-auto" disabled={busy || !form.prompt.trim()} onClick={onSave}>
              {busy ? '…' : editing ? 'Save changes' : 'Create prompt'}
            </Button>
          </div>

          {error ? (
            <p className="rounded-2xl border border-rose-300/70 bg-rose-soft/60 p-3 text-xs font-bold text-rose-700">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  )
}
