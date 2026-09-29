# -*- coding: utf-8 -*-
"""
Reading & Writing lessons: Craft and Structure, Expression of Ideas.

Original instructional writing. Nothing here is copied from College Board's
rationales; the item counts cited are from the bank listings, which is fact
rather than expression. See docs/DESIGN.md section 2.

Every section carries the gates that decide who sees it (web/assets/lessons.js):
  band   - hard score window
  tier   - only shown if the student's target requires winning that tier
  when   - evidence: unseen / struggling / mastered / missed a misconception
"""

LESSONS = [

# ---------------------------------------------------------------------------
{
 "id": "lesson-WIC", "skill_cd": "WIC", "title": "Words in Context",
 "subtitle": "The single most common question type in Reading & Writing",
 "sections": [
  {"id": "wic-what", "always": True,
   "heading": "What you are actually being asked",
   "body": [
    "This is not a vocabulary test. You are never asked what a word means in "
    "general - you are asked what it means **in this sentence**.",
    "That distinction is the whole question. Every wrong answer is a real word "
    "with a real meaning. It is wrong because it does not fit *here*.",
    "There are 261 of these in the official bank, 142 of them Easy. It is the "
    "largest single pool in Reading & Writing, which means it is also the "
    "cheapest place to buy points."]},

  {"id": "wic-method", "tier": "E",
   "heading": "The method: cover the choices",
   "body": [
    "**Read the sentence and predict your own word before you look at the "
    "options.** This one habit is worth more than any amount of vocabulary "
    "memorization.",
    "The choices are engineered so that at least two of them sound plausible "
    "if you read them *into* the blank. Predicting first means you are matching "
    "against your own answer instead of being led by theirs.",
    "Then: pick the choice closest to your prediction. If none is close, your "
    "reading of the sentence is wrong - go back to the sentence, not to the "
    "choices."]},

  {"id": "wic-signal", "tier": "E",
   "heading": "Find the word that controls the blank",
   "body": [
    "Every one of these sentences contains a word or phrase that fixes the "
    "answer. Usually it is:",
    "- a contrast marker (*but, however, although, despite, rather than*) - the "
    "blank opposes what came before",
    "- a restatement (*that is, in other words, i.e.*) - the blank echoes what "
    "came before",
    "- a cause marker (*because, since, therefore*) - the blank follows from it",
    "Underline that word first. The blank is almost never free-floating."]},

  {"id": "wic-struggle", "when": {"struggling": {"tier": "E", "below": 0.7}},
   "heading": "If you are missing the easy ones",
   "body": [
    "When an Easy Words-in-Context question goes wrong it is almost always one "
    "of two things, and neither is vocabulary:",
    "1. **You read the choices before predicting.** Go back and do it in the "
    "other order. It feels slower and is not.",
    "2. **You matched the topic instead of the function.** A sentence about "
    "astronomy will offer you an astronomy-flavoured word. Topic match is the "
    "most common trap in this question type - the correct answer is frequently "
    "the plainest word on the list."]},

  {"id": "wic-second", "tier": "M",
   "heading": "Common words in uncommon senses",
   "body": [
    "At the Medium tier College Board stops testing hard words and starts "
    "testing easy words used strangely. *Qualify* meaning limit. *Arrest* "
    "meaning stop. *Economy* meaning restraint. *Novel* meaning new.",
    "If a choice looks too simple to be the answer, that is often exactly why "
    "it is the answer. Check whether the simple word has a second meaning that "
    "fits before you reject it."]},

  {"id": "wic-hard", "tier": "H",
   "heading": "When two choices both fit",
   "body": [
    "At the Hard tier you will regularly get two words that both work "
    "logically. The tiebreaker is never 'which is more sophisticated'. It is "
    "one of:",
    "- **Strength.** Does the sentence support *suggests* or *proves*? Academic "
    "writing hedges; the stronger word is usually wrong.",
    "- **Connotation.** Is the author approving, neutral, or critical? Match "
    "the sentence's attitude, not just its logic.",
    "- **Collocation.** Which word actually goes with the noun in real English? "
    "*Pose a question* and *pose a threat*, never *pose an answer*."]},
 ]},

# ---------------------------------------------------------------------------
{
 "id": "lesson-TRA", "skill_cd": "TRA", "title": "Transitions",
 "subtitle": "Four relationships, one decision procedure",
 "sections": [
  {"id": "tra-what", "always": True,
   "heading": "The question in one line",
   "body": [
    "Every transition question asks the same thing: **what is the relationship "
    "between the sentence before the blank and the sentence after it?**",
    "Work out the relationship *before* you read a single choice. Then find the "
    "choice that expresses it. Doing it the other way round is how this "
    "question type takes points off people who know all the words."]},

  {"id": "tra-four", "tier": "E",
   "heading": "The procedure",
   "body": [
    "1. Cover the choices.",
    "2. Read the sentence before. Say what it does in your own words.",
    "3. Read the sentence after. Say what it does.",
    "4. Name the relationship: **same direction, opposite direction, cause, or "
    "example**. Almost everything is one of these four.",
    "5. *Now* look at the choices and take the one that matches.",
    "If you cannot name the relationship, you have not understood one of the "
    "two sentences. Reread - do not guess between transitions."]},

  {"id": "tra-directions", "tier": "E",
   "heading": "The four families",
   "body": [
    "**Same direction** - *furthermore, moreover, additionally, similarly, "
    "likewise, in fact, indeed*",
    "**Opposite direction** - *however, nevertheless, conversely, on the other "
    "hand, still, by contrast*",
    "**Cause and effect** - *therefore, thus, consequently, as a result, hence*",
    "**Example or specification** - *for example, for instance, specifically, "
    "namely, in particular*",
    "Learn them by family, not one at a time. On test day you are choosing "
    "between families first and members second."]},

  {"id": "tra-restatement",
   "when": {"count": {"misconception": "contrast-vs-addition", "atLeast": 3}},
   "heading": "You keep confusing contrast with addition",
   "body": [
    "This is the most common way to lose a transition question, and it has a "
    "specific cause: **a sentence that sounds surprising is not the same as a "
    "sentence that disagrees.**",
    "Ask: does the second sentence *contradict* the first, or does it *add to* "
    "it in a way you did not expect? Only genuine contradiction takes "
    "*however*.",
    "Test it out loud. If you can put *and also* between the two sentences "
    "without it sounding wrong, the answer is an addition word, no matter how "
    "dramatic the second sentence is."]},

  {"id": "tra-specification", "tier": "M",
   "heading": "Example versus specification",
   "body": [
    "*For example* introduces **one of several** - the thing that follows is a "
    "sample drawn from a larger group.",
    "*Specifically* and *namely* introduce **the whole thing, said more "
    "precisely** - there is no larger group, you are just zooming in.",
    "College Board separates these constantly at the Medium tier and most "
    "students treat them as interchangeable. If the following sentence "
    "restates the previous one in sharper terms, it is not an example."]},

  {"id": "tra-hard", "tier": "H",
   "heading": "Concession, and the no-transition case",
   "body": [
    "**Concession** - *granted, admittedly, to be sure, of course* - means 'I "
    "am conceding a point before I disagree with it'. Expect a *but* in the "
    "next sentence. If there is no reversal coming, concession is wrong.",
    "**The no-transition case.** Sometimes the sentences simply continue and "
    "the correct answer is the one that adds almost nothing. Students at 1400+ "
    "lose points here by assuming that a blank must be filled with something "
    "forceful. It does not. Plain sequence words are often correct."]},
 ]},

# ---------------------------------------------------------------------------
{
 "id": "lesson-SYN", "skill_cd": "SYN", "title": "Rhetorical Synthesis",
 "subtitle": "The most Medium-weighted skill on the test",
 "sections": [
  {"id": "syn-what", "always": True,
   "heading": "Why this one repays study",
   "body": [
    "You are given bullet-point notes and a stated goal, and you pick the "
    "sentence that best accomplishes **that goal**.",
    "Of the 204 of these in the bank, 124 are Medium - the most "
    "Medium-weighted skill in Reading & Writing. If your target sits between "
    "1100 and 1400, the Medium tier is exactly where your points are, so this "
    "is one of the highest-return skills on the whole test for you."]},

  {"id": "syn-goal", "tier": "E",
   "heading": "Read the goal first. Twice.",
   "body": [
    "**The goal sentence decides the answer. The notes only supply raw "
    "material.**",
    "Read the goal, then reread it, then go to the notes. Students who read "
    "the notes first arrive at the choices with a summary in their head and "
    "pick the best summary - which is not what was asked.",
    "Underline the verb in the goal: *emphasize*, *compare*, *explain*, "
    "*introduce*. That verb is the test."]},

  {"id": "syn-elim", "tier": "M",
   "heading": "Eliminate on the goal, not on truth",
   "body": [
    "Every choice here is **factually accurate** - they are all built from the "
    "notes you were given. So 'is this true?' eliminates nothing and wastes "
    "your time.",
    "The only question is 'does this do the stated job?'. A beautifully written "
    "sentence that compares when you were asked to emphasize is wrong.",
    "Work choice by choice and write G or X next to each: does it accomplish "
    "the goal, yes or no. Usually two are immediately X."]},

  {"id": "syn-struggle", "when": {"struggling": {"tier": "M", "below": 0.65}},
   "heading": "If these keep going wrong",
   "body": [
    "Check which mistake you are making, because the fixes are opposite:",
    "- **Picking the most informative sentence.** You are answering 'which "
    "summarises best'. Reread the goal and pick again - the right answer is "
    "often the one that leaves information out.",
    "- **Picking the sentence that uses the most notes.** Using more bullets is "
    "not a virtue. A goal that says *emphasize a similarity* wants two bullets "
    "and a comparison, not four bullets."]},

  {"id": "syn-hard", "tier": "H",
   "heading": "When two choices both hit the goal",
   "body": [
    "Then the tiebreaker is **precision of relationship**. If the goal is to "
    "emphasize a contrast, the winner explicitly marks the contrast rather "
    "than merely placing two facts side by side.",
    "Sentences that juxtapose without connecting are the standard near-miss at "
    "this tier. Look for the choice that names the relationship out loud."]},
 ]},
]
