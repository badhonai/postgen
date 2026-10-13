import { useState } from 'react'
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
  const [blacklistText, setBlacklistText] = useState(() =>
    listToCsv(value.blacklist ?? value.tabooWords),
  )

  return (
    <div className="space-y-4">
      <Field label="Tone & voice">
        <Textarea
          rows={2}
          value={value.tone ?? ''}
          onChange={(e) => set({ tone: e.target.value })}
          placeholder="confident, technical, no fluff"
        />
      </Field>

      <Field label="Blacklist words / symbols">
        <Input
          value={blacklistText}
          onChange={(e) => {
            setBlacklistText(e.target.value)
            set({ blacklist: csvToList(e.target.value), tabooWords: undefined })
          }}
          placeholder="gm, wagmi, guaranteed, risk-free, 🚀"
        />
      </Field>
    </div>
  )
}
