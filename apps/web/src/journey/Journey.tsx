import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Exam } from '../exams/types'
import { examSpec } from '../exams/registry'
import { loadIndex, type QuestionRef } from '../lib/bank'
import { buildJourney, type Chapter, type Leg, type Region, type SkillMeta } from './map'
import { StageView, type StageMode } from './Stage'
import { gemFor, gemHue, type GemState } from './gems'
import { Gem } from './Gem'
import { WorldMap } from './WorldMap'
import {
  dailyGoal, GOAL_MAX, GOAL_MIN, rankOf, setDailyGoal, streakOf, todayCount,
} from './quest'
import { Ivy } from './Ivy'
import { Blades, CheckMark, Star } from './Icons'
import { useReveal } from './reveal'
import { progress } from '../practice/mastery'
import { current, signOut } from '../auth/auth'
import { errorLog, open as openOnly } from '../errors/log'
import { StopGrid } from './StopGrid'
import './greenwood.css'
import { NextPoints } from './NextPoints'

/**
 * The map, not the inventory.
 *
 * Four levels, because the test has four and flattening any of them loses
 * something a student uses: the REGION is how they think about tonight ("I
 * am doing maths"), the REALM is how the score report breaks down, the PATH
 * is what a lesson is about, and the STOP is the thing they are actually
 * getting wrong.
 *
 * The game layer on top changes nothing about what gets practised - the
 * ranking engine decides that from the band model - and everything about
 * whether they come back tomorrow, which is the variable that makes the rest
 * of it matter at all.
 *
 * Nothing is locked. The route says what the sensible order IS, which is a
 * different thing from refusing to let anyone leave it.
 */
export function Journey({ exam }: { exam: Exam }) {
  const [bank, setBank] = useState<QuestionRef[]>([])
  const [skills, setSkills] = useState<SkillMeta[]>([])
  const [openRealm, setOpenRealm] = useState<string | null>(null)
  const [open, setOpen] = useState<
    { leg: Leg; subtype: string | null; mode: StageMode } | null
  >(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let live = true
    void loadIndex(exam).then((b) => live && setBank(b))
    void fetch(`${import.meta.env.BASE_URL}data/skills.json`)
      .then((r) => r.json())
      .then((b: { skills?: SkillMeta[] }) => live && setSkills(b.skills ?? []))
      .catch(() => undefined)
    return () => { live = false }
  }, [exam])

  useEffect(() => { setOpenRealm(null); setOpen(null) }, [exam])

  const regions = useMemo(
    () => (bank.length ? buildJourney(exam, bank, skills) : []),
    [exam, bank, skills, version],
  )
  const rank = useMemo(() => rankOf(exam), [exam, version])
  const streak = useMemo(() => streakOf(exam), [exam, version])
  const today = useMemo(() => todayCount(exam), [exam, version])
  const misses = useMemo(() => recentMisses(exam), [exam, version])
  const openErrors = useMemo(
    () => openOnly(errorLog(progress().attempts, exam)).length, [exam, version],
  )
  const [goal, setGoal] = useState(() => dailyGoal(exam))
  useEffect(() => { setGoal(dailyGoal(exam)) }, [exam])

  if (open) {
    return (
      <StageView exam={exam} bank={bank}
        leg={open.leg} subtype={open.subtype} mode={open.mode}
        onBack={() => { setOpen(null); setVersion((v) => v + 1) }} />
    )
  }

  const cleared = regions.reduce((n, r) => n + r.cleared, 0)
  const all = regions.reduce((n, r) => n + r.stages, 0)

  return (
    <div className="wrap wide journey">
      <Ivy side="left" />
      <Ivy side="right" />
      <div className="top">
        <div>
          <h1>{examSpec(exam).label}: The Quest</h1>
          <p className="who">
            {cleared} of {all} stops behind you. Start anywhere &mdash; the
            route is advice, not a gate.
          </p>
        </div>
        <div className="row tight">
          <Link className="btn-sm" to="/homework">Homework</Link>
          <Link className="btn-sm" to="/">Switch test</Link>
          {/* Only a teacher sees the door to the portal. A student should not
              be one click from the roster, and hiding it is not the control -
              the database is - but there is no reason to show it either. */}
          {current()?.role === 'teacher' && (
            <Link className="btn-sm" to="/teacher">Teacher portal</Link>
          )}
          <button className="btn-sm" onClick={() => void signOut()}>Sign out</button>
        </div>
      </div>

      {/* The mistakes tab sits above everything, because a student with
          twenty spare minutes should not have to decide what to work on -
          and what they got wrong last week is always the right answer. The
          count is on the tab so it is a fact rather than an invitation. */}
      <nav className="exam-tabs">
        <span className="tab-on">The map</span>
        <Link className="tab" to={`/${exam}/mistakes`}>
          Practice recent mistakes
          {misses > 0 && <b className="tab-n">{misses}</b>}
        </Link>
        <Link className="tab" to={`/${exam}/errors`}>
          Error log
          {openErrors > 0 && <b className="tab-n">{openErrors}</b>}
        </Link>
      </nav>

      <div className="questbar">
        <div className="qb-rank">
          <div className="qb-level">{rank.level}</div>
          <div>
            <div className="qb-title">{rank.title}</div>
            <div className="qb-xp">{rank.xp} XP</div>
            <div className="qb-track">
              <i style={{ width: `${(rank.into / rank.span) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="qb-stat">
          <div className="qb-n">{streak}</div>
          <div className="qb-l">day{streak === 1 ? '' : 's'} running</div>
        </div>
        {/* The goal is the student's to set. Twelve was our guess, and a
            guess shown as a target tells a student doing four on a school
            night that they are failing, which is not true and was never
            ours to say. */}
        <div className="qb-stat">
          <div className="qb-n">{today}<span className="qb-of">/{goal}</span></div>
          <div className="qb-l">today</div>
          <div className="qb-track small">
            <i style={{ width: `${Math.min(100, (today / goal) * 100)}%` }} />
          </div>
          {/* Typable, because stepping from 12 to 40 one tap at a time is
              not a control, it is a chore. The steppers stay for the small
              adjustments they are actually good at. */}
          <div className="goal-set">
            <button className="goal-step" aria-label="Lower the daily goal"
              disabled={goal <= GOAL_MIN}
              onClick={() => setGoal(setDailyGoal(exam, goal - 1))}>−</button>
            <input className="goal-input" type="number" inputMode="numeric"
              min={GOAL_MIN} max={GOAL_MAX} value={goal}
              aria-label="Questions a day"
              onChange={(e) => setGoal(Number(e.target.value))}
              onBlur={() => setGoal(setDailyGoal(exam, goal))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setGoal(setDailyGoal(exam, goal))
              }} />
            <button className="goal-step" aria-label="Raise the daily goal"
              disabled={goal >= GOAL_MAX}
              onClick={() => setGoal(setDailyGoal(exam, goal + 1))}>+</button>
          </div>
          <div className="goal-note">questions a day</div>
        </div>
      </div>

      {/* What is actually costing marks, before the map. A student who
          opens the app to "do some practice" should meet the diagnosis
          first and the geography second. */}
      <NextPoints exam={exam} />

      {regions.map((region) => (
        <Region key={region.id} region={region} exam={exam}
          openRealm={openRealm} setOpenRealm={setOpenRealm}
          onOpen={(leg, subtype, mode) => setOpen({ leg, subtype, mode })} />
      ))}
    </div>
  )
}

function Region({
  region, exam, openRealm, setOpenRealm, onOpen,
}: {
  region: Region
  exam: Exam
  openRealm: string | null
  setOpenRealm: (id: string | null) => void
  onOpen: (leg: Leg, subtype: string | null, mode: StageMode) => void
}) {
  const [ref, shown] = useReveal<HTMLElement>()
  return (
        <section ref={ref}
          className={`region world-${region.terrain} reveal ${shown ? 'in' : ''}`}>
          <div className="region-head">
            <h2>{region.name}</h2>
            <span className="region-count">
              {region.cleared}/{region.stages} stops
            </span>
          </div>

          {/* Each world gets its own map, drawn in its own country. A
              student moves between the two sections constantly, and the
              colour says which one they are in before they read a word. */}
          <WorldMap chapters={region.chapters} terrain={region.terrain}
            openId={openRealm}
            onPick={(id) => {
              const next = openRealm === id ? null : id
              setOpenRealm(next)
              // Tapping a realm on the map should TAKE you there. Opening a
              // card 2,000px further down and leaving the student looking at
              // the map is the interaction answering a different question
              // from the one they asked.
              if (next) goTo(`realm-${next}`)
            }} />

          {/* The trail runs from the map down past every realm rather than
              stopping at the frame. The map was already drawing a road and
              the page under it reverted to a stack of cards, which read as
              two different ideas about what this screen is. */}
          <div className="region-body">
          {region.chapters.map((chapter) => (
            <RealmCard key={chapter.id} chapter={chapter} exam={exam}
              open={openRealm === chapter.id}
              onToggle={() => setOpenRealm(openRealm === chapter.id ? null : chapter.id)}
              onOpen={onOpen} />
          ))}
          </div>
        </section>
  )
}

function RealmCard({
  chapter, exam, open, onToggle, onOpen,
}: {
  chapter: Chapter
  exam: Exam
  open: boolean
  onToggle: () => void
  onOpen: (leg: Leg, subtype: string | null, mode: StageMode) => void
}) {
  const [ref, shown] = useReveal<HTMLDivElement>()
  const pct = chapter.stages ? (chapter.cleared / chapter.stages) * 100 : 0
  const state = pct >= 100 ? 'done' : pct > 0 ? 'under-way' : 'ahead'
  const hue = gemHue(chapter.name)
  const solo = chapter.legs.length === 1

  // The realm's own gems, so the card says what is left to collect rather
  // than only what has been done. Four empty sockets is a goal; four blanks
  // is nothing.
  const gems = chapter.legs.map((leg): [string, GemState] =>
    [leg.skill, gemFor(exam, leg.skill, leg.stages.length > 0
      && leg.cleared === leg.stages.length)])
  const sealed = gems.every(([, g]) => g !== 'none')

  return (
    <div ref={ref} className={`realm-card ${state} reveal ${shown ? 'in' : ''}`}
      id={`realm-${chapter.id}`}>
      <button className="realm-head" onClick={onToggle} aria-expanded={open}>
        <span className={`realm-seal ${sealed ? 'sealed' : ''}`}>
          {sealed ? <Star size={18} /> : chapter.legs.length}
        </span>
        <span className="realm-body">
          <span className="realm-t">{chapter.name}</span>
          <span className="realm-d">
            {chapter.legs.length} path{chapter.legs.length === 1 ? '' : 's'} &middot;{' '}
            {chapter.cleared} of {chapter.stages} stops
          </span>
          <span className="qb-track"><i style={{ width: `${pct}%` }} /></span>
          {/* What this realm still holds. The counts exist on every level of
              the map; showing them here is what stops a student believing
              that moving up a level finished the one below. */}
          <span className="realm-left">
            {chapter.left > 0 && (
              <span>{chapter.left} question{chapter.left === 1 ? '' : 's'} left</span>
            )}
            {chapter.fresh > 0 && (
              <span className="new-flag">{chapter.fresh} new</span>
            )}
          </span>
          <span className="realm-gems" aria-hidden="true">
            {gems.map(([skill, g]) => (
              <Gem key={skill} state={g} hue={hue} size={15} />
            ))}
          </span>
        </span>
        <span className="realm-chevron">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="realm-paths">
          {/* Sideways, one path per column. The eight realms are the
              journey and they go down; the recognitions inside one of them
              are a shelf you walk along, and stacking them turned a realm
              into four hundred pixels of vertical list that buried the
              realm after it. */}
          {/* Several paths run as a shelf you walk sideways along; that is
              what the SAT's realms look like and it works. A realm with ONE
              path has nothing to put beside it, and the shelf renders as a
              lone 335px column stranded in a full-width card - which is
              every ACT realm, because the ACT's reporting categories are
              the paths. One path gets the full width and its stops laid out
              as a map instead. */}
          <div className={solo ? 'path-wide' : 'path-rail'}>
          {chapter.legs.map((leg) => (
            <div className="path" key={leg.skill}>
              <div className="path-name">
                <Gem hue={hue} size={17}
                  state={gemFor(exam, leg.skill,
                    leg.stages.length > 0 && leg.cleared === leg.stages.length)}
                  title={`Gem for ${leg.name}`} />
                {leg.name}
                <span className="path-count">
                  {leg.cleared}/{leg.stages.length}
                  {leg.fresh > 0 && <b className="new-flag">{leg.fresh} new</b>}
                </span>
              </div>
              <StopList wide={solo}>
                {leg.stages.map((s) => (
                  <li key={s.subtype}>
                    <button className={`stop ${s.cleared ? 'cleared' : s.seen ? 'started' : ''}`}
                      onClick={() => onOpen(leg, s.subtype, 'stage')}>
                      <span className="stop-dot" aria-hidden="true" />
                      <span className="stop-body">
                        <span className="stop-t">{s.name}</span>
                        <span className="stop-d">
                          {s.left === 0 && s.total > 0
                            ? `all ${s.total} done`
                            : s.left < s.total
                              ? `${s.left} of ${s.total} left`
                              : `${s.total} question${s.total === 1 ? '' : 's'}`}
                          {s.accuracy !== null && ` · ${Math.round(s.accuracy * 100)}%`}
                          {s.fresh > 0 && <b className="new-flag">{s.fresh} new</b>}
                        </span>
                      </span>
                      {s.cleared && (
                        <span className="stop-seal"><CheckMark /></span>
                      )}
                    </button>
                  </li>
                ))}
                {leg.trial && (
                  <li>
                    <button className="stop trial"
                      onClick={() => onOpen(leg, null, 'trial')}>
                      <span className="stop-dot" aria-hidden="true" />
                      <span className="stop-body">
                        <span className="stop-t">Trial &mdash; reading the question</span>
                        <span className="stop-d">
                          {leg.trial.families.length} ways these get asked
                        </span>
                      </span>
                      <span className="stop-seal"><Blades /></span>
                    </button>
                  </li>
                )}
                {leg.quiz && (
                  <li>
                    <button className="stop quiz"
                      onClick={() => onOpen(leg, null, 'quiz')}>
                      <span className="stop-dot" aria-hidden="true" />
                      <span className="stop-body">
                        <span className="stop-t">
                          Unit quiz &mdash; all of it, mixed
                        </span>
                        {/* Said plainly, because the alternative is a student
                            treating the quiz as a wall in front of the gem. */}
                        <span className="stop-d">
                          {gemFor(exam, leg.skill, leg.stages.length > 0
                            && leg.cleared === leg.stages.length) === 'polished'
                            ? 'Already polished — come back any time to brush up'
                            : leg.cleared === leg.stages.length
                              ? `The gem is yours. Pass this for a better one`
                              : `${leg.quiz.questions} questions for a better gem — `
                                + 'or clear every stop and the plain one is yours'}
                        </span>
                      </span>
                      <span className="stop-seal">
                        <Gem hue={hue} size={18}
                          state={gemFor(exam, leg.skill, leg.stages.length > 0
                            && leg.cleared === leg.stages.length)} />
                      </span>
                    </button>
                  </li>
                )}
              </StopList>
            </div>
          ))}
          </div>
          {!solo && (
            <p className="rail-hint tiny muted">
              {chapter.legs.length} paths &mdash; scroll sideways
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export type { Region }


/**
 * The stops, as a column or as a map.
 *
 * A list is right when it sits beside its neighbours and the eye only has to
 * go down. Alone in a full-width card it is a thin ribbon of text with a
 * screenful of nothing next to it, and the honest shape there is the one the
 * rest of the page is already using: a route that reaches the edge and turns
 * back.
 */
function StopList({ wide, children }: { wide: boolean; children: React.ReactNode }) {
  if (!wide) return <ol className="stops">{children}</ol>
  return <StopGrid>{children}</StopGrid>
}


/**
 * Scroll to a realm after it opens.
 *
 * Deferred by two frames rather than one: the card has to mount AND lay out
 * its paths before its position is worth measuring, and scrolling to where
 * it used to be lands the student half a screen off.
 */
function goTo(id: string): void {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = document.getElementById(id)
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    })
  }))
}


/** Misses in the window the mistakes tab draws from. */
function recentMisses(exam: Exam): number {
  const cut = Date.now() - 21 * 86400000
  return progress().attempts.filter(
    (a) => a.exam === exam && !a.correct && Date.parse(a.at) >= cut,
  ).length
}
