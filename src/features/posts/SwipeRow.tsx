import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react'

/** How far the card must travel before the action fires. */
const THRESHOLD = 84
/** Hard cap on the drag, with a rubber-band feel past it. */
const MAX = 170

export type SwipeTone = 'approve' | 'publish' | 'delete'

export type SwipeAction = {
  label: string
  tone: SwipeTone
  onRun: () => void
}

const TONE_CLASS: Record<SwipeTone, string> = {
  approve: 'bg-[#34c98e] text-white',
  publish: 'bg-[#4f7dff] text-white',
  delete: 'bg-rose-soft text-rose-700',
}

function ToneIcon({ tone }: { tone: SwipeTone }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (tone === 'delete') {
    return (
      <svg {...common}>
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        <path d="M10 11v5M14 11v5" />
      </svg>
    )
  }
  if (tone === 'publish') {
    return (
      <svg {...common}>
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  )
}

/**
 * A card that answers to horizontal swipes: drag it right to expose `left`,
 * left to expose `right`. Past the threshold the action fires on release —
 * there is no half-open state to get stuck in.
 *
 * Vertical scrolling still works (`touch-action: pan-y`), and a horizontal
 * drag suppresses the click so the card doesn't also open.
 */
export default function SwipeRow({
  left,
  right,
  disabled = false,
  children,
}: {
  /** Revealed by swiping the card to the right. */
  left?: SwipeAction
  /** Revealed by swiping the card to the left. */
  right?: SwipeAction
  disabled?: boolean
  children: ReactNode
}) {
  const [dx, setDx] = useState(0)
  const [live, setLive] = useState(false)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const axis = useRef<'none' | 'x' | 'y'>('none')
  const dxRef = useRef(0)
  const armedRef = useRef(false)
  const movedRef = useRef(false)

  const write = (v: number) => {
    dxRef.current = v
    setDx(v)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || (!left && !right)) return
    origin.current = { x: e.clientX, y: e.clientY }
    axis.current = 'none'
    armedRef.current = false
    movedRef.current = false
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* capture is best-effort */
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const o = origin.current
    if (!o) return
    const ddx = e.clientX - o.x
    const ddy = e.clientY - o.y
    if (axis.current === 'none') {
      if (Math.abs(ddx) > 6 && Math.abs(ddx) > Math.abs(ddy)) {
        axis.current = 'x'
        setLive(true)
      } else if (Math.abs(ddy) > 6) {
        axis.current = 'y'
        return
      } else return
    }
    if (axis.current !== 'x') return
    const raw = Math.max(-MAX, Math.min(MAX, ddx))
    movedRef.current = Math.abs(raw) > 10
    armedRef.current = Math.abs(raw) > THRESHOLD
    write(raw)
  }

  const onPointerUp = () => {
    const o = origin.current
    origin.current = null
    axis.current = 'none'
    setLive(false)
    if (!o) return
    const offset = dxRef.current
    const armed = armedRef.current
    write(0)
    if (!armed) return
    if (offset < 0) right?.onRun()
    else left?.onRun()
  }

  /** A finished drag must not fall through and open the post. */
  const onClickCapture = (e: MouseEvent) => {
    if (!movedRef.current) return
    e.preventDefault()
    e.stopPropagation()
    movedRef.current = false
  }

  const layer = (action: SwipeAction, side: 'left' | 'right') => (
    <div
      aria-hidden="true"
      className={`absolute inset-y-0 flex ${side === 'left' ? 'left-0' : 'right-0'}`}
    >
      <div className={`flex h-full w-[92px] flex-col items-center justify-center gap-1 text-[11px] font-extrabold ${TONE_CLASS[action.tone]}`}>
        <ToneIcon tone={action.tone} />
        {action.label}
      </div>
    </div>
  )

  return (
    <div className="relative overflow-hidden rounded-[20px]" onClickCapture={onClickCapture}>
      {left ? layer(left, 'left') : null}
      {right ? layer(right, 'right') : null}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative touch-pan-y select-none"
        style={{
          transform: `translate3d(${dx}px,0,0)`,
          transition: live ? 'none' : 'transform 240ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
