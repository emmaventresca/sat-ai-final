# -*- coding: utf-8 -*-
"""Triage and test intuition: how to spend the time you have, at your band.

The advice here genuinely reverses across the score range - "guess and move on
Hard" is correct at 1100 and actively wrong at 1500 - so almost every section is
band-gated. A student never sees the advice written for somebody else.

Numbers cited come from data/bands.json, which is derived from the official
raw-to-scaled conversion tables. Original instructional writing."""

LESSONS = [

{
 "id": "lesson-TRIAGE", "skill_cd": None, "type": "triage", "pinned": True,
 "section": "both",  # test strategy is not section-specific
 "title": "How to spend the test",
 "subtitle": "Your plan depends on your target, and so does this page",
 "sections": [

  {"id": "tri-frame", "always": True,
   "heading": "You are not trying to answer every question",
   "body": [
    "You are trying to **collect a number**. Which questions you collect it "
    "from is your choice, and choosing well is worth more than any single "
    "piece of content knowledge.",
    "The plan below is calculated from your target, using College Board's own "
    "score conversion tables. It will change as your target changes."]},

  # ---- 1000-1250 -------------------------------------------------------
  {"id": "tri-low", "band": [800, 1250],
   "heading": "Your plan: own Easy, fight for Medium, skip Hard",
   "body": [
    "At this target you need roughly **two questions in three** - not all of "
    "them. That changes everything about how you should sit the test.",
    "- **Every Easy question is non-negotiable.** A rushed Easy question costs "
    "you a point you already owned. This is where your score is actually lost.",
    "- **Medium is where your points are.** Almost all of your study time "
    "belongs here.",
    "- **Hard is optional.** Guess and move on, deliberately and without guilt."]},

  {"id": "tri-low-why", "band": [800, 1250],
   "heading": "Why skipping Hard genuinely costs you nothing",
   "body": [
    "There is no penalty for a wrong answer, and every question is four-choice "
    "or a grid-in. So guessing the whole Hard tier still pays you about a "
    "quarter of it - which, at this target, is roughly the entire Hard "
    "contribution you needed.",
    "This is not a consolation strategy. Run the numbers from the conversion "
    "tables and the Hard requirement comes out at **zero** for every math "
    "target up to 600. The time you save is worth more than the questions.",
    "**Answer every question anyway.** Never leave a blank - guess and move."]},

  {"id": "tri-low-clock", "band": [800, 1250],
   "heading": "The ten-second rule",
   "body": [
    "Read the question. If you do not know your **first move** within about ten "
    "seconds, flag it and go.",
    "Not the answer - the first move. If you cannot see where to start, this is "
    "not your question today.",
    "Do a full pass taking everything you can see a route into, then come back. "
    "You will often find that the second look is easy, because you are no "
    "longer panicking about the clock."]},

  # ---- 1250-1420 -------------------------------------------------------
  {"id": "tri-mid", "band": [1250, 1420],
   "heading": "Your plan: Medium must be near-perfect",
   "body": [
    "Easy is assumed now - if you are still dropping Easy questions, that is "
    "the only thing worth working on this week, and it is worth more than any "
    "Hard content.",
    "**Medium is the battleground.** At this target you need essentially all of "
    "it, so the work shifts from 'can I do this type' to 'can I do this type "
    "reliably under time'.",
    "Hard is now worth a **small, selective** amount: take the Hard questions in "
    "the skills you are already strong in, and leave the ones in your weak "
    "skills. This app will not offer you Hard material in a skill until you "
    "have shown you own the Medium tier of it."]},

  {"id": "tri-mid-errors", "band": [1250, 1420],
   "heading": "Sort your errors before you study",
   "body": [
    "At this band most lost points are **not** knowledge gaps. Sort every miss "
    "into one of three piles:",
    "- **Careless** - you knew it, you misread or slipped. Fix with process, "
    "not study: underline the actual question, check units, reread the last "
    "line before answering.",
    "- **Slow** - you would have got it with more time. Fix by making Medium "
    "faster, not by learning Hard.",
    "- **Genuine gap** - you did not know the method. This is the only pile "
    "that deserves a lesson.",
    "Most students at this band study the third pile and lose their points to "
    "the first."]},

  # ---- 1420+ -----------------------------------------------------------
  {"id": "tri-high", "band": [1420, 1600],
   "heading": "Your plan: Hard is mandatory and the clock is the constraint",
   "body": [
    "The advice that was right at 1100 is now wrong for you. **You cannot skip "
    "the Hard tier** - at this target you need most of it, so triage stops "
    "being about what to abandon and becomes about ordering.",
    "Take the test in two passes. First pass: everything you can do at full "
    "speed, no exceptions, no lingering. Second pass: the flagged ones, with "
    "the time you banked.",
    "Your errors at this level are overwhelmingly **careless, not conceptual**. "
    "One misread question costs the same as one you could not do."]},

  {"id": "tri-high-module", "band": [1420, 1600],
   "heading": "The second module is the real test",
   "body": [
    "The digital SAT is adaptive in two stages. Module 1 is a fixed mix; how "
    "you do on it decides whether Module 2 is the easy or the hard form.",
    "For you, Module 2 will be the hard form - which means **your practice "
    "should look like the hard form**, not like an average mix. That is exactly "
    "what this app does when your target is set high: it filters the official "
    "item pool to the upper difficulty tiers rather than sampling it evenly.",
    "It also means Module 1 matters more than its questions suggest. A careless "
    "slip there routes you to an easier Module 2 with a lower ceiling."]},

  {"id": "tri-high-last", "band": [1420, 1600],
   "heading": "The last 30 points",
   "body": [
    "Above about 1500 the remaining points are nearly all in three places:",
    "- **quantifiers** - *all, most, only, always, never* in Reading & Writing "
    "answer choices",
    "- **the question actually asked** - solving for x when it wanted 2x, "
    "giving the area when it wanted the perimeter",
    "- **arithmetic under time pressure** - use Desmos even when you do not "
    "think you need it",
    "None of these is content. Build the checking habit instead of studying "
    "more material."]},

  # ---- universal -------------------------------------------------------
  {"id": "tri-guess", "always": True,
   "heading": "Guessing, properly",
   "body": [
    "**Never leave a question blank.** There is no penalty, so a blank is a "
    "guaranteed zero where a guess is worth a quarter of a point on average.",
    "If you are going to guess, do it immediately and move - a guess made after "
    "two minutes costs you the two minutes as well.",
    "On grid-ins a guess is worth almost nothing, so spend your leftover "
    "seconds on unanswered multiple choice instead."]},

  {"id": "tri-flag", "always": True,
   "heading": "Use the flag button",
   "body": [
    "Bluebook lets you flag a question and returns you to it. Most students "
    "never use it and instead grind on a question they have already decided is "
    "hard.",
    "Flag, move, come back. The review screen at the end of each module shows "
    "you exactly what you flagged and what you left blank."]},
 ]},
]
