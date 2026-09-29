# -*- coding: utf-8 -*-
"""Information and Ideas: Central Ideas, Inferences, Command of Evidence,
Cross-Text Connections. Original instructional writing."""

LESSONS = [

{
 "id": "lesson-CID", "skill_cd": "CID", "title": "Central Ideas and Details",
 "subtitle": "Main idea, and the questions that only look like main idea",
 "sections": [
  {"id": "cid-what", "always": True,
   "heading": "Two questions wearing one name",
   "body": [
    "**Main idea** asks what the whole passage is doing. **Detail** asks what "
    "one specific line says. They need opposite reading strategies, and the "
    "first thing to do is work out which one you have.",
    "If the question says *the text as a whole* or *primarily*, it is main "
    "idea. If it points at a fact, a number, or a named thing, it is detail."]},

  {"id": "cid-main", "tier": "E",
   "heading": "Main idea: the scope test",
   "body": [
    "The right answer covers **the whole passage and nothing outside it**. So "
    "wrong answers fail in exactly two directions:",
    "- **Too narrow** - true, but only about one sentence. This is the trap "
    "most students fall for, because the statement is verifiably correct.",
    "- **Too broad** - a general claim the passage never quite makes.",
    "Ask of each choice: *does the passage support all of this, and does the "
    "passage do more than this?* A yes to the second means too narrow."]},

  {"id": "cid-detail", "tier": "E",
   "heading": "Detail: go back and point at it",
   "body": [
    "**You must be able to put your finger on the line that proves it.** If "
    "you cannot, you are remembering the passage rather than reading it, and "
    "your memory has been shaped by the choices you just read.",
    "This is slower for about two questions and then it is faster, because you "
    "stop second-guessing."]},

  {"id": "cid-hard", "tier": "H",
   "heading": "The half-right answer",
   "body": [
    "At the Hard tier the standard wrong answer is **correct in its first half "
    "and wrong in its second**. It names the right topic and then attaches the "
    "wrong claim about it.",
    "Read every choice to the end. Students lose these by recognising the "
    "opening words and stopping."]},
 ]},

{
 "id": "lesson-INF", "skill_cd": "INF", "title": "Inferences",
 "subtitle": "72 of the 140 are Hard - the most top-weighted skill in R&W",
 "sections": [
  {"id": "inf-what", "always": True,
   "heading": "Inference does not mean guess",
   "body": [
    "On the SAT an inference is **the thing that must be true given what you "
    "were told**. Not the likely thing, not the reasonable thing - the "
    "unavoidable thing.",
    "This is stricter than everyday English and it is the whole difficulty. "
    "The answer is usually a smaller, duller claim than you expect."]},

  {"id": "inf-weight", "always": True,
   "heading": "Where this sits for you",
   "body": [
    "Of the 140 inference items in the bank, 72 are Hard and only 20 are Easy. "
    "It is the most top-heavy skill in Reading & Writing.",
    "If your target does not require the Hard tier, do not sink time here - "
    "secure Words in Context and Transitions first, where the Easy items "
    "actually live. This lesson will show you the Hard material once your "
    "target asks for it."]},

  {"id": "inf-method", "tier": "M",
   "heading": "The method",
   "body": [
    "1. Read the text and note what it **establishes**, not what it suggests.",
    "2. The blank usually completes a logical move. Finish the thought "
    "yourself before reading choices.",
    "3. Test each choice with: *could this be false even though everything in "
    "the passage is true?* If yes, eliminate it.",
    "That last test is the entire skill. Apply it literally."]},

  {"id": "inf-hard", "tier": "H",
   "heading": "The three Hard traps",
   "body": [
    "- **The extra step.** The choice is true *if* you add one more assumption. "
    "That assumption is not in the passage. Eliminate.",
    "- **The reversal.** The passage establishes A causes B; the choice says B "
    "causes A. Logically fluent, factually unsupported.",
    "- **Strength creep.** The passage says *some* or *may*; the choice says "
    "*most* or *will*. Quantifiers and modals decide more Hard inference "
    "questions than content does.",
    "Circle every *all, most, only, always, never, must* in the choices before "
    "you decide."]},
 ]},

{
 "id": "lesson-COE", "skill_cd": "COE", "title": "Command of Evidence",
 "subtitle": "The biggest pool in R&W, and the most Hard-weighted",
 "sections": [
  {"id": "coe-what", "always": True,
   "heading": "Two forms",
   "body": [
    "**Textual** - which quotation best supports this claim? **Quantitative** - "
    "which statement is supported by this table or graph?",
    "277 items, 121 of them Hard. It is the largest pool in Reading & Writing "
    "and the most top-weighted, so what you do here should depend heavily on "
    "your target."]},

  {"id": "coe-textual", "tier": "M",
   "heading": "Textual: match the claim, not the topic",
   "body": [
    "Restate the claim in your own words first, then ask of each quotation: "
    "*does this establish that specific claim?*",
    "The standard wrong answer is **on topic and off claim** - a quotation "
    "about the right subject that supports a neighbouring point. Topic overlap "
    "is not support."]},

  {"id": "coe-quant", "tier": "M",
   "heading": "Quantitative: read the axes before the choices",
   "body": [
    "Spend ten seconds on the figure before you look at anything else: what is "
    "measured, in what units, over what range, and what do the groups mean.",
    "Then evaluate choices one at a time **against the figure only**. Three "
    "recurring traps:",
    "- a true statement the figure does not actually show",
    "- a correct comparison in the wrong direction",
    "- a claim about a group the figure does not break out",
    "Never bring outside knowledge. The figure is the entire universe."]},

  {"id": "coe-struggle", "when": {"struggling": {"tier": "M", "below": 0.65}},
   "heading": "If the quantitative ones are the problem",
   "body": [
    "Try covering the choices and writing one true sentence about the figure "
    "yourself before reading them. Most errors here happen because a choice "
    "*sounds* like a chart sentence and the eye accepts it.",
    "If your own sentence and none of the choices agree, you have misread an "
    "axis. Go back to the axis rather than to the choices."]},

  {"id": "coe-hard", "tier": "H",
   "heading": "Hypothesis questions",
   "body": [
    "The hardest version gives a researcher's hypothesis and asks which result "
    "would **support** or **weaken** it.",
    "Work out the direction first and write it down: *if the hypothesis is "
    "right, the number for group A should be [higher / lower] than group B*. "
    "Then find the choice that says that.",
    "Deciding the direction before reading the choices is the single highest-"
    "value habit at this tier."]},
 ]},

{
 "id": "lesson-CTC", "skill_cd": "CTC", "title": "Cross-Text Connections",
 "subtitle": "Only 61 items, but predictable",
 "sections": [
  {"id": "ctc-what", "always": True,
   "heading": "One question, asked every time",
   "body": [
    "Two short texts, and you are asked **how the second author would respond "
    "to the first** (or how they relate).",
    "The smallest pool in Reading & Writing at 61 items - so it is worth "
    "knowing the shape, and not worth a study week."]},

  {"id": "ctc-method", "tier": "M",
   "heading": "Two sentences, written down",
   "body": [
    "Before the choices, write: *Author 1 thinks ___.* and *Author 2 thinks "
    "___.* Then name the relationship - agree, disagree, qualify, or address a "
    "different aspect.",
    "**Qualify is the most common and the least expected.** Author 2 often "
    "accepts most of Author 1's position and disputes one piece of it. Answers "
    "claiming flat disagreement are usually too strong."]},

  {"id": "ctc-hard", "tier": "H",
   "heading": "Agreeing with the wrong thing",
   "body": [
    "At the Hard tier the near-miss is a choice where Author 2 responds to a "
    "claim Author 1 did not actually make - typically a stronger version of "
    "it.",
    "Check that the thing being responded to is genuinely in Text 1, in those "
    "terms."]},
 ]},

{
 "id": "lesson-TSP", "skill_cd": "TSP", "title": "Text Structure and Purpose",
 "subtitle": "Function, not content",
 "sections": [
  {"id": "tsp-what", "always": True,
   "heading": "Ask what the sentence does, not what it says",
   "body": [
    "*What is the function of the underlined sentence?* is asking about the "
    "sentence's **job in the paragraph**, not its subject matter.",
    "The reliable move: cover the sentence and ask what would be missing "
    "without it. That is its function."]},

  {"id": "tsp-verbs", "tier": "E",
   "heading": "The function verbs",
   "body": [
    "Answers are built from a small set of verbs. Knowing them speeds "
    "everything up: *introduces, illustrates, qualifies, contrasts, explains, "
    "summarises, challenges, provides evidence for, anticipates an objection*.",
    "Pick the verb before you pick the choice. Then find the choice using that "
    "verb - and check that what follows the verb is also right."]},

  {"id": "tsp-trap", "tier": "M",
   "heading": "The content trap",
   "body": [
    "The standard wrong answer **accurately describes what the sentence says** "
    "and says nothing about what it does. It is tempting precisely because it "
    "is true.",
    "If a choice could be written by someone who only read that one sentence "
    "and not the paragraph around it, it is almost certainly wrong."]},

  {"id": "tsp-hard", "tier": "H",
   "heading": "Whole-text structure",
   "body": [
    "The Hard variant asks about the passage's overall structure. Sketch it as "
    "you read: *claim, then objection, then response*. Three or four words in "
    "the margin.",
    "Wrong answers get the pieces right and the **order** wrong. Check the "
    "sequence, not just the ingredients."]},
 ]},
]
