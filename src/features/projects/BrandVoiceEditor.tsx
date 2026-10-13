import type { BrandVoice } from '../../lib/types'
import { Field, Input, Textarea } from '../../components/ui'

function csvToList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function listToCsv(list: string[] | undefined): string {
  return (list ?? []).join(', ')
}

export default function BrandVoiceEditor({
  value,
  onChange,
}: {
  value: BrandVoice
  onChange: (next: BrandVoice) => void
}) {
  const set = (patch: Partial<BrandVoice>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-4">
      <Field label="Tone & voice" hint="e.g. “confident, technical, no fluff, explains like to a friend”">
        <Textarea
          rows={2}
          value={value.tone ?? ''}
          onChange={(e) => set({ tone: e.target.value })}
          placeholder="confident, technical, no fluff"
        />
      </Field>

      <Field
        label="Blacklist words / symbols"
        hint="Comma-separated. Agents get a hard block (403) on these; the web editor warns you. Words match at word boundaries, symbols match anywhere."
      >
        <Input
          value={listToCsv(value.blacklist ?? value.tabooWords)}
          onChange={(e) => set({ blacklist: csvToList(e.target.value), tabooWords: undefined })}
          placeholder="gm, wagmi, guaranteed, risk-free, 🚀"
        />
      </Field>
    </div>
  )
}
