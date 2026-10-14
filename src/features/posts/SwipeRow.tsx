import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

/** How far the card must travel before the action fires. */
const THRESHOLD = 84
/** Hard cap on the drag, with a rubber-band feel past it. */
const MAX = 170
/** Movement before the gesture commits to an axis. */
const AXIS_SLOP = 6

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

type Drag = {
  id: number
  x0: number
  y0: number
  axis: 'none' | 'x' | 'y'
  armed: boolean
  last: number
}

/**
 * A card that answers to horizontal swipes: drag it right to expose `left`,
 * left to expose `right`. Past the threshold the action fires on release —
 * there is no half-open state to get stuck in.
 *
 * The drag is tracked on `window` rather than with pointer capture: capture
 * retargets the follow-up click to the capturing element, which would stop a
 * plain tap from opening the post. Vertical scrolling still works
 * (`touch-action: pan-y`), and a horizontal drag suppresses the click.
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
  const drag = useRef<Drag | null>(null)
  const movedRef = useRef(false)

  // latest callbacks, so the window listeners below never need re-binding
  const actions = useRef<{ left?: SwipeAction; right?: SwipeAction }>({})
  useEffect(() => {
    actions.current = { left, right }
  }, [left, right])

  const enabled = !disabled && (!!left || !!right)

  useEffect(() => {
    if (!enabled) return

    const onMove = (e: PointerEvent) => {
      const d = drag.current
      if (!d || e.pointerId !== d.id) return
      const ddx = e.clientX - d.x0
      const ddy = e.clientY - d.y0
      if (d.axis === 'none') {
        if (Math.abs(ddx) > AXIS_SLOP && Math.abs(ddx) > Math.abs(ddy)) {
          d.axis = 'x'
          setLive(true)
        } else if (Math.abs(ddy) > AXIS_SLOP) {
          d.axis = 'y'
          return
        } else return
      }
      if (d.axis !== 'x') return
      const raw = Math.max(-MAX, Math.min(MAX, ddx))
      d.armed = Math.abs(raw) > THRESHOLD
      d.last = raw
      movedRef.current = Math.abs(raw) > 10
      setDx(raw)
    }

    const settle = (commit: boolean) => (e: PointerEvent) => {
      const d = drag.current
      if (!d || e.pointerId !== d.id) return
      const { armed, last } = d
      drag.current = null
      setLive(false)
      setDx(0)
      if (!commit || !armed) return
      if (last < 0) actions.current.right?.onRun()
      else actions.current.left?.onRun()
    }

    const onUp = settle(true)
    const onCancel = settle(false)

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [enabled])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled) return
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, axis: 'none', armed: false, last: 0 }
    movedRef.current = false
  }

  /** A finished drag must not fall through and open the post. */
  const onClickCapture = (e: ReactMouseEvent) => {
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
      <div
        className={`flex h-full w-[92px] flex-col items-center justify-center gap-1 text-[11px] font-extrabold ${TONE_CLASS[action.tone]}`}
      >
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
        onDragStart={(e) => e.preventDefault()}
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
