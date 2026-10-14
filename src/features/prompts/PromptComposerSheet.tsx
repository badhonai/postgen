import type { ImagePrompt } from './api'
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
  onProjects,
  onSave,
  onClose,
  onPick,
  renderThumb,
}: Props) {
  const set = (patch: Partial<ComposerForm>) => onChange({ ...form, ...patch })

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
                Reference media · {refs.length}
              </span>
              <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={onPick}>
                {refs.length ? 'Change' : 'Add'}
              </Button>
            </div>
            {refs.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {refs.map((id) => (
                  <span key={id} className="relative">
                    {renderThumb(id)}
                    <button
                      type="button"
                      aria-label="Remove reference"
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
                None yet — references teach the style.
              </p>
            )}
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
