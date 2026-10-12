import type { GemState } from './gems'

/**
 * A gem, in three states.
 *
 * Empty is an outline, so a student can see the shape of what is missing -
 * four sockets in a realm is a goal; four blanks is nothing. Earned is
 * solid. Polished has a facet and a glint, because the quiz version has to
 * be visibly better at a glance or there is no reason to take it.
 */
export function Gem({
  state, hue, size = 24, title,
}: {
  state: GemState
  hue: [string, string]
  size?: number
  title?: string
}) {
  const [dark, light] = hue
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`gem gem-${state}`}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={!title}>
      {state === 'none' ? (
        <path d="M12 2 L20 9 L12 22 L4 9 Z" fill="none"
          stroke="currentColor" strokeWidth="1.5" opacity=".45" />
      ) : (
        <>
          <path d="M12 2 L20 9 L12 22 L4 9 Z" fill={dark} />
          <path d="M12 2 L20 9 L12 22 Z" fill={light} />
          {state === 'polished' && (
            <>
              <path d="M4 9 L20 9" stroke="#fff" strokeWidth="1" opacity=".55" />
              <path d="M12 2 L12 22" stroke="#fff" strokeWidth=".8" opacity=".35" />
              <path d="M7.5 5.6 l1.6 1.4 -1.6 1.4 -1.6 -1.4 z" fill="#fff" opacity=".9" />
            </>
          )}
        </>
      )}
    </svg>
  )
}
