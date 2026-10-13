import { useState } from 'react'
import type { Terrain } from './map'
import { backdrop, THEME } from './backdrops'
import { Poster } from './Scene'
import './sheet.css'

/**
 * A contact sheet for every world.
 *
 * Ten scenes side by side with a stand-in for the question card on each,
 * because the only question worth asking about these is whether they work
 * UNDER the card. A background judged on its own always looks better than it
 * does in use - which is how four rounds of this got approved in my head and
 * rejected on screen.
 */
const WORLDS: Terrain[] = ['cliffs', 'ocean', 'park', 'fair', 'peaks', 'tropic']

const TITLE: Record<string, string> = {
  'the-green-country': 'The Green Country',
  'the-long-road': 'The Long Road',
  'the-elder-wood': 'The Elder Wood',
  'the-river-crossing': 'The River Crossing',
  'the-watchtower': 'The Watchtower',
  'the-high-pass': 'The High Pass',
  'the-white-silence': 'The White Silence',
  'the-stair-of-kings': 'The Stair of Kings',
  'the-last-gate': 'The Last Gate',
  'the-final-ascent': 'The Final Ascent',
}

function pretty(slug: string): string {
  return TITLE[slug] ?? slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

export function Sheet() {
  const [world, setWorld] = useState<Terrain>('cliffs')
  const theme = THEME[world]

  return (
    <div className="sheet">
      <h1>{theme.name}</h1>
      <p className="sheet-sub">
        {theme.section}. Ten flat posters &mdash; the pale rectangle is where
        the question card sits, so judge the composition against it rather
        than on its own.
      </p>
      <div className="sheet-tabs">
        {WORLDS.map((t) => (
          <button key={t} className={t === world ? 'on' : ''}
            onClick={() => setWorld(t)}>
            {THEME[t].name}
          </button>
        ))}
      </div>
      <div className="sheet-grid">
        {Array.from({ length: 10 }, (_, i) => {
          // Show the real artwork where it exists. This sheet is the tool for
          // reviewing the sixty backdrops, and it was rendering the drawn
          // placeholder every time - so the one screen built to judge the art
          // was the one screen that never showed it.
          const art = backdrop(world, i)
          return (
            <figure key={`${world}${i}`}>
              <div className="sheet-frame">
                {art.placeholder
                  ? <Poster terrain={world} slot={i} />
                  : <img className="sheet-art" src={art.src} alt="" loading="lazy" />}
                <div className="sheet-card">question card</div>
              </div>
              <figcaption>
                <b>{i + 1}. {pretty(art.scene)}</b>
                {art.placeholder && <em className="sheet-ph"> &middot; drawn placeholder</em>}
              </figcaption>
            </figure>
          )
        })}
      </div>
    </div>
  )
}
