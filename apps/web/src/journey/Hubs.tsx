/**
 * The four lands of a section, drawn as places rather than marked as dots.
 *
 * The first map put all 111 recognitions on one page as serpentine rows of
 * icons, which is a table wearing a map's clothes: nothing was anywhere for
 * a reason, and no part of it told you what kind of work it held.
 *
 * A section has four domains. Four is a map. So each domain is a LAND with
 * its own country - Algebra a gentle grazed valley, Advanced Math a range of
 * dark peaks, Problem-Solving a cliff coast, Geometry a summit - and you
 * zoom into one rather than scanning past it. The vignettes are drawn here
 * because they have to answer to the data: a land's size on the map does not
 * change, but how much of it is settled does.
 */
export type Vibe = 'valley' | 'peaks' | 'cliffs' | 'summit'
  | 'harbour' | 'wood' | 'town' | 'bridge'

/** Which country a domain is. Keyed on the College Board's own names. */
export const VIBE: Record<string, Vibe> = {
  'Algebra': 'valley',
  'Advanced Math': 'peaks',
  'Problem-Solving and Data Analysis': 'cliffs',
  'Geometry and Trigonometry': 'summit',
  'Information and Ideas': 'harbour',
  'Craft and Structure': 'wood',
  'Expression of Ideas': 'town',
  'Standard English Conventions': 'bridge',
}

export const VIBE_NAME: Record<Vibe, string> = {
  valley: 'The Grazed Valley',
  peaks: 'The Dark Range',
  cliffs: 'The Cliff Coast',
  summit: 'The Summit',
  harbour: 'The Harbour',
  wood: 'The Old Wood',
  town: 'The Market Town',
  bridge: 'The Crossing',
}

const SKY: Record<Vibe, [string, string]> = {
  valley: ['#bfe0ef', '#eaf6e2'],
  peaks: ['#55617a', '#9aa6bd'],
  cliffs: ['#a8d3e4', '#e8f1ef'],
  summit: ['#f2c98a', '#fde9c8'],
  harbour: ['#9fcfe2', '#f2ead6'],
  wood: ['#86b58e', '#dfeedb'],
  town: ['#e9c9a8', '#faf0e2'],
  bridge: ['#b9cfe0', '#eef3f6'],
}

/**
 * One land, drawn. 200x120, meant to be read at a glance and at size.
 *
 * Each is built from the same three bands - sky, far form, near ground - so
 * eight different countries still read as one atlas.
 */
export function Vignette({ vibe }: { vibe: Vibe }) {
  const [a, b] = SKY[vibe]
  const id = `sky-${vibe}`
  return (
    <svg viewBox="0 0 200 120" className="hub-art" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={a} /><stop offset="100%" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="200" height="120" fill={`url(#${id})`} />
      {vibe === 'valley' && (
        <>
          <path d="M0 78 Q40 60 78 74 T140 66 T200 76 V120 H0 z" fill="#8ebf6e" />
          <path d="M0 92 Q54 78 104 90 T200 86 V120 H0 z" fill="#6ca455" />
          {[36, 62, 88, 124, 152].map((x, i) => (
            <g key={x} fill="#fdfdf8">
              <ellipse cx={x} cy={100 - (i % 2) * 6} rx="5" ry="3.4" />
              <circle cx={x + 4.6} cy={98 - (i % 2) * 6} r="1.9" fill="#4a4336" />
            </g>
          ))}
          <path d="M168 74 v-16 M162 62 l6 -6 l6 6" stroke="#5a7a46"
            strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      )}
      {vibe === 'peaks' && (
        <>
          <path d="M0 96 L34 44 L62 78 L92 30 L126 80 L158 50 L200 96 z" fill="#3c4559" />
          <path d="M92 30 L104 48 L80 48 z M34 44 L44 58 L25 58 z M158 50 L167 62 L149 62 z"
            fill="#eef2f7" />
          <path d="M0 104 L40 84 L84 100 L132 86 L200 104 V120 H0 z" fill="#2a3040" />
        </>
      )}
      {vibe === 'cliffs' && (
        <>
          <path d="M0 86 H200 V120 H0 z" fill="#7fb6c9" />
          <path d="M0 58 H74 L88 86 H0 z" fill="#c8a882" />
          <path d="M0 58 H74 L80 70 H0 z" fill="#ded0b2" />
          <path d="M120 70 H200 V86 H132 z" fill="#c8a882" />
          <path d="M0 92 q26 -5 52 0 t52 0 t52 0 t44 0" stroke="#fff"
            strokeWidth="2" fill="none" opacity=".7" />
          <circle cx="66" cy="50" r="3.4" fill="#fdfdf8" />
          <path d="M62 54 h9 v5 h-9 z" fill="#fdfdf8" />
        </>
      )}
      {vibe === 'summit' && (
        <>
          <path d="M0 110 L56 56 L98 92 L140 38 L200 110 z" fill="#8a7f9c" />
          <path d="M140 38 L156 60 L122 60 z M56 56 L68 72 L43 72 z" fill="#fff" />
          <path d="M0 112 L52 96 L108 110 L160 98 L200 112 V120 H0 z" fill="#5f5672" />
          <path d="M140 38 v-12 M140 26 h13 l-4 5 4 5 h-13" fill="#c2452f" stroke="none" />
        </>
      )}
      {vibe === 'harbour' && (
        <>
          <path d="M0 84 H200 V120 H0 z" fill="#79b2c6" />
          <path d="M0 70 q30 -10 62 -2 t58 -4 t80 2 V84 H0 z" fill="#d6c49c" />
          <path d="M126 84 v-30 M126 54 l22 12 l-22 8 z" fill="#f6f2e4" stroke="#6a5f48" strokeWidth="1.6" />
          <path d="M108 84 h40 l-6 8 h-28 z" fill="#8a6a46" />
        </>
      )}
      {vibe === 'wood' && (
        <>
          <path d="M0 88 H200 V120 H0 z" fill="#5d8a52" />
          {[18, 48, 80, 116, 150, 182].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 92 v-14`} stroke="#4a3a28" strokeWidth="3.4" />
              <path d={`M${x - 14} 78 L${x} 44 L${x + 14} 78 z`}
                fill={i % 2 ? '#2f6b3a' : '#3d7d46'} />
            </g>
          ))}
        </>
      )}
      {vibe === 'town' && (
        <>
          <path d="M0 92 H200 V120 H0 z" fill="#c9b48c" />
          {[24, 60, 100, 142, 176].map((x, i) => (
            <g key={x}>
              <path d={`M${x - 14} 92 V${68 - (i % 2) * 8} h28 V92 z`} fill="#f2e3cc" />
              <path d={`M${x - 18} ${68 - (i % 2) * 8} h36 l-18 -13 z`} fill="#b1583f" />
            </g>
          ))}
        </>
      )}
      {vibe === 'bridge' && (
        <>
          <path d="M0 96 H200 V120 H0 z" fill="#86a9bd" />
          <path d="M0 78 H200 V86 H0 z" fill="#d9cfbb" />
          {[26, 74, 126, 174].map((x) => (
            <path key={x} d={`M${x - 16} 96 q16 -22 32 0 z`} fill="#b7ab93" />
          ))}
          <path d="M0 78 H200" stroke="#8d8370" strokeWidth="2" />
        </>
      )}
    </svg>
  )
}
