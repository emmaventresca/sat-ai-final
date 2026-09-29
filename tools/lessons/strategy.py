# -*- coding: utf-8 -*-
"""
Cross-cutting strategy: how the test is built, and how to read it.

These are not about any one skill. They are the intuition that makes every other
lesson land faster - what a wrong answer is *for*, what to do when two choices
both work, where time actually goes.

Several sections are trigger-gated on evidence rather than on band, so they
appear when a student has actually made the error they describe. Original
writing throughout.
"""

LESSONS = [

{
 "id": "lesson-DISTRACTORS", "skill_cd": None, "section": "rw", "pinned": True,
 "type": "strategy",
 "title": "How wrong answers are built",
 "subtitle": "The most transferable thing on this page",
 "sections": [
  {"id": "dis-why", "always": True,
   "heading": "Every wrong answer is somebody's specific mistake",
   "body": [
    "College Board does not invent wrong answers at random. **Each one is the "
    "answer you get if you make one particular error** - you misread a "
    "quantifier, you matched the topic instead of the claim, you solved for "
    "the wrong variable.",
    "This is the single most useful fact about the test, because it turns "
    "review into diagnosis. When you get one wrong, the question is never "
    "'what was the answer'. It is **'which mistake does my answer correspond "
    "to'** - and that mistake will show up again in a different costume.",
    "It is also why third-party practice questions are worth so little. Their "
    "wrong answers are frequently arbitrary, which teaches you to eliminate "
    "the odd one out rather than to recognise your own error."]},

  {"id": "dis-families", "always": True,
   "heading": "The four families, in Reading and Writing",
   "body": [
    "- **Right topic, wrong claim.** True about the passage, but not the thing "
    "being asked. The most common trap in the whole section.",
    "- **Too strong.** The passage says *may* or *some*; the choice says *will* "
    "or *most*. Academic writing hedges - the confident answer is usually wrong.",
    "- **Half right.** Correct opening, wrong second half. Read every choice all "
    "the way to the end.",
    "- **One step beyond.** True *if* you add an assumption the passage never "
    "makes.",
    "When you are down to two, name which family the loser belongs to. If you "
    "cannot, you have not found the difference yet - keep looking rather than "
    "picking the one that sounds better."]},

  {"id": "dis-math", "always": True,
   "heading": "And in Math",
   "body": [
    "Math distractors are mostly **the answer to a different question**:",
    "- you solved for $x$ when it asked for $2x$, or for $x + 3$",
    "- you found the radius when it wanted the diameter, the area when it "
    "wanted the perimeter",
    "- you dropped a negative, or forgot to flip an inequality",
    "- you answered the intermediate step and stopped",
    "So the check is always the same: **reread the last line of the question "
    "and confirm your number answers it.** This catches more points at every "
    "level than any content review."]},

  {"id": "dis-strength",
   "when": {"count": {"misconception": "too-strong", "atLeast": 3}},
   "heading": "You are picking answers that overclaim",
   "body": [
    "Three of your recent misses were the strong version of a true idea. That "
    "is a habit, and it has a mechanical fix.",
    "**Before choosing, circle every quantifier and modal in the remaining "
    "choices** - *all, most, only, always, never, must, will, cannot*. Then ask "
    "whether the passage actually supports that word.",
    "In this section the cautious answer wins far more often than it loses."]},

  {"id": "dis-topic",
   "when": {"count": {"misconception": "topic-not-claim", "atLeast": 3}},
   "heading": "You are matching the topic, not the claim",
   "body": [
    "Your recent misses share a shape: the choice was about the right subject "
    "but supported a neighbouring point.",
    "**Restate the claim in your own words before reading the choices**, and "
    "write it down if you can. Then test each choice against your sentence "
    "rather than against the passage as a whole.",
    "Topic overlap feels like evidence and is not."]},
 ]},

{
 "id": "lesson-ELIMINATION", "skill_cd": None, "section": "both", "pinned": True,
 "type": "strategy",
 "title": "Predict, then eliminate",
 "subtitle": "The order you do things in is worth points by itself",
 "sections": [
  {"id": "el-predict", "always": True,
   "heading": "Answer the question before you read the answers",
   "body": [
    "Cover the choices. Work out what you think, in your own words. *Then* "
    "look.",
    "This sounds like a small thing and it is the largest single behavioural "
    "difference between students who plateau and students who do not. The "
    "choices are engineered to be persuasive; arriving with your own answer "
    "means you are **matching** rather than being **led**.",
    "If nothing resembles your prediction, the problem is your reading of the "
    "question, not the choices. Go back to the question."]},

  {"id": "el-eliminate", "always": True,
   "heading": "Eliminate on one reason, and name it",
   "body": [
    "Cross out a choice only when you can say **why** in three words - 'too "
    "strong', 'wrong topic', 'answers step one'.",
    "Vague elimination ('feels off') is how you cross out the right answer. If "
    "you cannot name the flaw, leave it in and come back.",
    "Mark the paper: **X** for eliminated, **?** for maybe. Two clean X's turn "
    "a four-way guess into a coin flip, and that is worth real points even "
    "when you never find the answer."]},

  {"id": "el-two", "always": True,
   "heading": "When two are left",
   "body": [
    "Stop rereading the choices and **go back to the text or the question**. "
    "The difference between the final two is always *in the source*, never in "
    "the choices themselves - which is why staring at them harder does not "
    "work.",
    "Find the one word that separates them: a quantifier, a tense, a "
    "comparison, a unit. That word is the question."]},

  {"id": "el-guess", "always": True,
   "heading": "Then commit",
   "body": [
    "There is no penalty for a wrong answer, so **never leave anything blank** "
    "and never spend a third minute on a two-way split.",
    "Pick, flag it, move on. You can come back with fresh eyes, and you will "
    "have banked the time to do it."]},
 ]},

{
 "id": "lesson-TIME", "skill_cd": None, "section": "both", "pinned": True,
 "type": "strategy",
 "title": "Where the time actually goes",
 "subtitle": "Pacing, and the two-pass method",
 "sections": [
  {"id": "tm-budget", "always": True,
   "heading": "The real budget",
   "body": [
    "Reading and Writing gives you about **1 minute 11 seconds** per question "
    "(27 questions in 32 minutes, twice). Math gives you about **1 minute 35 "
    "seconds** (22 questions in 35 minutes, twice).",
    "But those are averages, and treating them as a per-question limit is a "
    "mistake. A words-in-context question should take 30 seconds; a "
    "hypothesis-support question with a table can take two and a half minutes "
    "and be worth it.",
    "**Bank time on the fast ones so you can spend it on the slow ones.** That "
    "is the entire skill."]},

  {"id": "tm-twopass", "always": True,
   "heading": "Two passes, always",
   "body": [
    "**First pass:** everything you can see a route into, at full speed. If you "
    "do not know your first move within about ten seconds, flag it and go. Not "
    "the answer - the *first move*.",
    "**Second pass:** the flagged ones, with the time you banked.",
    "Students who grind linearly through a module run out of time having never "
    "seen questions at the end they could have answered in twenty seconds. "
    "That is the most expensive error on the test and it has nothing to do "
    "with knowing the material."]},

  {"id": "tm-sunk", "always": True,
   "heading": "The sunk-cost minute",
   "body": [
    "The dangerous moment is ninety seconds into a question you have already "
    "half-solved. Every instinct says finish it, because you have invested.",
    "**The investment is gone either way.** The only question is whether the "
    "next minute is better spent here or on the two questions you have not "
    "read yet. It is almost always the two questions.",
    "Flag it. Come back. You will often solve it in fifteen seconds on the "
    "second look, because the thing you were stuck on stops mattering once you "
    "are not panicking about it."]},

  {"id": "tm-errors", "always": True,
   "heading": "Sort your errors before you study",
   "body": [
    "After every practice test, put each miss in one of three piles. The piles "
    "need completely different fixes, and studying the wrong one is how people "
    "work hard without moving:",
    "- **Careless** - you knew it, you slipped. Fix with *process*: underline "
    "the question, check units, reread the last line before answering.",
    "- **Slow** - you would have got it with more time. Fix by making the "
    "things you already know *faster*, not by learning new material.",
    "- **Gap** - you did not know the method. This is the only pile that needs "
    "a lesson.",
    "Most students have far fewer gaps than they think, and fix none of the "
    "other two."]},
 ]},

{
 "id": "lesson-DIGITAL", "skill_cd": None, "section": "both", "pinned": True,
 "type": "strategy",
 "title": "Using the app itself",
 "subtitle": "Bluebook's own tools, which most students never touch",
 "sections": [
  {"id": "dg-adaptive", "always": True,
   "heading": "The test adapts, and that changes Module 1",
   "body": [
    "Each section is two modules. Module 1 is a fixed mix; **how you do on it "
    "decides whether Module 2 is the easier or the harder form**, and only the "
    "harder form can reach the top of the scale.",
    "So Module 1 matters more than its questions suggest. A careless slip "
    "there does not just cost that question - it can route you to a module "
    "with a lower ceiling.",
    "Practical consequence: **do not save your care for the hard module.** "
    "Module 1 is where the routing is decided."]},

  {"id": "dg-tools", "always": True,
   "heading": "The four tools on screen",
   "body": [
    "- **Flag.** Marks a question and lets you jump back from the review "
    "screen. This is what makes the two-pass method possible - use it "
    "constantly.",
    "- **Answer eliminator.** Turn it on in the options menu. Crossing out a "
    "choice on screen is the difference between eliminating and *remembering* "
    "that you eliminated.",
    "- **Desmos.** A full graphing calculator on every math question. See the "
    "Desmos lesson - it replaces most of the algebra.",
    "- **Reference sheet.** Every area and volume formula, always available. "
    "Do not memorise them and do not work from memory.",
    "- **Annotate.** Highlight text and leave a note. Useful for marking the "
    "claim in an evidence question."]},

  {"id": "dg-review", "always": True,
   "heading": "The review screen",
   "body": [
    "At the end of each module you get a grid of every question, showing which "
    "you answered and which you flagged.",
    "**Use the last two minutes on it deliberately:** first fill in every blank "
    "with a guess, then revisit flags. A blank is a guaranteed zero and a guess "
    "is worth a quarter of a point, so filling blanks always outranks polishing "
    "an answer you already have."]},

  {"id": "dg-afterwards", "always": True,
   "heading": "Afterwards, in My Practice",
   "body": [
    "Once you finish a practice test, **My Practice** shows every question with "
    "your answer, the correct answer, and the skill College Board assigns it.",
    "That review list is what to send your teacher - screenshots of the "
    "*scrolling list*, not of each question separately. Four to eight images "
    "cover a whole test instead of thirty-five, and the skill tags are already "
    "on the screen.",
    "This app turns those into lessons keyed to what you actually missed."]},
 ]},
]
