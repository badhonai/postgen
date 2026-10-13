import type { BrandVoice } from '../../lib/types'
import { Field, Input, Select } from '../../components/ui'

function csvToList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim().replace(/^#/, ''))
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
      <p className="text-xs text-zinc-500">
        Guides how AI agents write posts for this project (used from M4). All fields optional.
      </p>

      <Field label="Tone & voice" hint="e.g. “confident, technical, no fluff, explains like to a friend”">
        <Input
          value={value.tone ?? ''}
          onChange={(e) => set({ tone: e.target.value })}
          placeholder="confident, technical, no fluff"
        />
      </Field>

      <Field label="Emoji policy">
        <Select
          value={value.emojiPolicy ?? 'light'}
          onChange={(e) => set({ emojiPolicy: e.target.value })}
        >
          <option value="none">None</option>
          <option value="light">Light (occasional)</option>
          <option value="any">Free to use</option>
        </Select>
      </Field>

      <Field label="Taboo words" hint="Comma-separated — the agent must never use these.">
        <Input
          value={listToCsv(value.tabooWords)}
          onChange={(e) => set({ tabooWords: csvToList(e.target.value) })}
          placeholder="gm, wagmi, guaranteed, risk-free"
        />
      </Field>

      <Field label="Default hashtags" hint="Comma-separated, without #.">
        <Input
          value={listToCsv(value.hashtags)}
          onChange={(e) => set({ hashtags: csvToList(e.target.value) })}
          placeholder="web3, defi"
        />
      </Field>

      <Field label="CTA style" hint="How posts should close.">
        <Input
          value={value.ctaStyle ?? ''}
          onChange={(e) => set({ ctaStyle: e.target.value })}
          placeholder="soft CTA — “follow for more”"
        />
      </Field>
    </div>
  )
}
