# -*- coding: utf-8 -*-
"""Standard English Conventions: Boundaries and Form, Structure, and Sense.

The most rule-governed part of the test, and therefore the fastest to fix.
Original instructional writing."""

LESSONS = [

{
 "id": "lesson-BOU", "skill_cd": "BOU", "title": "Boundaries",
 "subtitle": "Punctuation between clauses - 213 items, and pure rules",
 "sections": [
  {"id": "bou-what", "always": True,
   "heading": "Why this is the best-value grammar to learn",
   "body": [
    "Boundaries questions are about **where one thought stops and the next "
    "begins**: periods, semicolons, colons, commas, dashes.",
    "Unlike reading, this is rule-governed. There is no judgement call and no "
    "'best' answer - there is a correct one. Learn the rules once and the "
    "question type stops costing you anything, permanently.",
    "213 items in the bank, 97 of them Hard, so it keeps paying at every "
    "target."]},

  {"id": "bou-test", "tier": "E",
   "heading": "The only test you need: can it stand alone?",
   "body": [
    "Before anything else, decide for the text on **each side of the "
    "punctuation**: is it a complete sentence on its own?",
    "Mark them S (sentence) or F (fragment). Then:",
    "- **S + S** - period, semicolon, or comma + FANBOYS (*for, and, nor, but, "
    "or, yet, so*). Never a bare comma.",
    "- **S + F** or **F + S** - comma, or no punctuation at all. Never a "
    "semicolon.",
    "That single test decides the large majority of these questions, and it "
    "requires no grammar vocabulary at all."]},

  {"id": "bou-comma-splice",
   "when": {"count": {"misconception": "sentence-boundary", "atLeast": 3}},
   "heading": "You are accepting comma splices",
   "body": [
    "A comma cannot join two complete sentences. Not when they are short, not "
    "when they are closely related, not when it sounds fine out loud.",
    "*The experiment failed, the sample was contaminated* is wrong however "
    "natural it reads. It needs a period, a semicolon, a colon, or *and*/"
    "*because*.",
    "When you are down to two choices and one uses a bare comma between two "
    "S's, it is out. No exceptions on this test."]},

  {"id": "bou-colon", "tier": "M",
   "heading": "Colons and dashes",
   "body": [
    "**Colon** - what comes *before* it must be a complete sentence. What "
    "comes after can be anything: a list, a phrase, another sentence. The rule "
    "is entirely about the left side.",
    "**Dash** - a single dash works like a colon. A **pair** of dashes works "
    "like a pair of commas, fencing off an interruption.",
    "The pairing rule matters: you cannot open with a dash and close with a "
    "comma. Punctuation around an interruption must match at both ends."]},

  {"id": "bou-hard", "tier": "H",
   "heading": "The long interrupter",
   "body": [
    "Hard boundaries questions bury a long modifier in the middle of the "
    "sentence so that you lose track of the main clause.",
    "**Cross out the interrupter and reread.** What remains must be a "
    "grammatical sentence with correct punctuation. This converts a hard "
    "question into an easy one every time.",
    "Also watch for the **no-punctuation** choice. At this tier it is right "
    "more often than students expect, because the instinct is that a long "
    "sentence needs a break somewhere. It does not."]},
 ]},

{
 "id": "lesson-FSS", "skill_cd": "FSS", "title": "Form, Structure, and Sense",
 "subtitle": "Agreement, tense, and modifiers - 99 Easy items",
 "sections": [
  {"id": "fss-what", "always": True,
   "heading": "What is tested",
   "body": [
    "Subject-verb agreement, pronouns, verb tense, and modifier placement.",
    "99 of its 208 items are Easy - the second most Easy-weighted skill in "
    "Reading & Writing after Words in Context. If you are building a floor, "
    "this is where to build it."]},

  {"id": "fss-agree", "tier": "E",
   "heading": "Agreement: find the real subject",
   "body": [
    "College Board's whole technique here is putting distance between the "
    "subject and the verb, then filling the gap with nouns of the other "
    "number.",
    "*The **collection** of rare manuscripts and early printed books **is**...*",
    "**Cross out every prepositional phrase** (*of...*, *in...*, *with...*, "
    "*along with...*) and the subject is left standing alone. Then agreement "
    "is obvious.",
    "Note that *along with*, *as well as*, and *in addition to* do **not** "
    "make a subject plural. Only *and* does."]},

  {"id": "fss-pronoun", "tier": "E",
   "heading": "Pronouns",
   "body": [
    "Two things to check, in order:",
    "1. **Number** - does it match what it refers to? *Each*, *every*, "
    "*either*, and *neither* are singular, always.",
    "2. **Clarity** - could the pronoun refer to two different things? Then it "
    "is wrong, even if you can tell which was meant.",
    "*Its* is possessive, *it's* is *it is*. *Their* possessive, *they're* "
    "*they are*, *there* a place. These appear at every tier."]},

  {"id": "fss-tense", "tier": "M",
   "heading": "Tense: match the passage, not the sentence",
   "body": [
    "The correct tense is set by the **surrounding sentences**, so read the "
    "sentence before and after before choosing.",
    "Time markers decide it: *since 1990* wants present perfect (*has "
    "studied*), *in 1990* wants simple past (*studied*), *by the time X "
    "happened* wants past perfect (*had studied*).",
    "Find the time marker first. It is nearly always there."]},

  {"id": "fss-modifier", "tier": "M",
   "heading": "Modifiers attach to whatever is nearest",
   "body": [
    "*Having studied the data for months, the conclusion was obvious.* The "
    "conclusion did not study anything.",
    "When a sentence opens with a descriptive phrase and a comma, **the very "
    "next noun must be the thing being described**. Check that one join and "
    "the question is done.",
    "This is the most reliably spottable error on the test - it is visible "
    "without reading the rest of the sentence."]},

  {"id": "fss-hard", "tier": "H",
   "heading": "Parallelism and comparison",
   "body": [
    "**Parallelism** - items in a list or joined by *and*/*or* must share a "
    "grammatical form. *She liked hiking, swimming, and to ride* breaks it.",
    "**Comparison** - you must compare like with like. *The climate of Mars is "
    "colder than Earth* compares a climate to a planet. It needs *than that of "
    "Earth*.",
    "Both are quiet errors that read smoothly. At the Hard tier, if nothing "
    "seems wrong, check the list and check the comparison."]},
 ]},
]
