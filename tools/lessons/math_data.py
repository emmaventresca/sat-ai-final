# -*- coding: utf-8 -*-
"""Problem-Solving and Data Analysis (domain Q): 421 items. The most
Easy-weighted math domain per item, and the one where careful reading beats
technique. Original writing."""

LESSONS = [

{
 "id": "lesson-Q.A.", "skill_cd": "Q.A.",
 "title": "Ratios, rates, and units",
 "subtitle": "93 items, and mostly a units exercise",
 "sections": [
  {"id": "qa-what", "always": True,
   "heading": "Set it up as a proportion and let the units check it",
   "body": [
    "Write the proportion with **matching units diagonally**, cross-multiply, "
    "solve. Almost every question in this skill is that, once.",
    "The most reliable habit: write the units next to every number. If your "
    "setup produces 'miles per gallon per hour', the setup is wrong and you "
    "have caught it before doing any arithmetic."]},

  {"id": "qa-convert", "tier": "E",
   "heading": "Unit conversion is a multiplication chain",
   "body": [
    "Multiply by fractions equal to 1, arranged so the unit you do not want "
    "cancels:",
    "*60 miles/hour × (1 hour / 60 minutes) = 1 mile/minute.*",
    "Set up the chain so everything cancels except the unit the answer needs. "
    "Then do the arithmetic once, at the end.",
    "**Wrong answers are usually the right number with the wrong conversion** - "
    "multiplied where you should have divided. The cancelling check catches "
    "exactly that."]},

  {"id": "qa-struggle", "when": {"struggling": {"tier": "E", "below": 0.7}},
   "heading": "If these are going wrong",
   "body": [
    "It is nearly always one of two things, and neither is the maths:",
    "1. **You did not write the units down.** Do it. It takes five seconds and "
    "it is the entire error-check.",
    "2. **You answered a different question.** These problems often ask for a "
    "total when you have computed a rate, or the other way round. Reread the "
    "last line before choosing."]},
 ]},

{
 "id": "lesson-Q.B.", "skill_cd": "Q.B.", "title": "Percentages",
 "subtitle": "84 items",
 "sections": [
  {"id": "qb-what", "always": True,
   "heading": "Translate the sentence literally",
   "body": [
    "**is** means =, **of** means ×, **what** means your variable. *What "
    "percent of 300 is 75* becomes (x/100)(300) = 75.",
    "Doing the translation word by word removes almost all the difficulty in "
    "this skill."]},

  {"id": "qb-change", "tier": "M",
   "heading": "Percent change, and why it is not symmetric",
   "body": [
    "**Percent change = (new − old) / old.** The denominator is always the "
    "**original** value, and that is where the points are lost.",
    "A rise from 40 to 50 is a 25% increase. A fall from 50 back to 40 is a "
    "**20%** decrease, not 25%. Different starting points, different "
    "denominators.",
    "**Increase by 20%** is × 1.2. **Decrease by 20%** is × 0.8. Successive "
    "changes multiply: up 20% then down 20% gives 0.96, not 1."]},

  {"id": "qb-hard", "tier": "H",
   "heading": "Working backwards",
   "body": [
    "*After a 15% discount the price is $68. What was the original?* The answer "
    "is **not** 68 × 1.15.",
    "68 is 85% of the original, so the original is 68 / 0.85. Write the "
    "equation 0.85x = 68 rather than trying to reverse the percentage in your "
    "head - reversing it in your head is the trap the question is built on."]},
 ]},

{
 "id": "lesson-Q.C.", "skill_cd": "Q.C.",
 "title": "One-variable data: center and spread",
 "subtitle": "84 items",
 "sections": [
  {"id": "qc-what", "always": True,
   "heading": "Mean, median, and which one the question wants",
   "body": [
    "**Mean** is the average. **Median** is the middle value once sorted. "
    "**Mode** is the most frequent. **Range** is max minus min.",
    "Sorting first is not optional for median questions, and forgetting to "
    "sort is the single most common error in this skill."]},

  {"id": "qc-outlier", "tier": "M",
   "heading": "What outliers do",
   "body": [
    "**An outlier drags the mean and barely moves the median.** That one "
    "sentence answers a large share of the questions here.",
    "So: *which measure best represents a typical value when the data contains "
    "an extreme value* - the median, always.",
    "Adding a very large value increases the mean and leaves the median roughly "
    "where it was. Expect to be asked exactly that."]},

  {"id": "qc-spread", "tier": "M",
   "heading": "Standard deviation without computing it",
   "body": [
    "**You are never asked to calculate standard deviation.** You are asked to "
    "compare two data sets and say which has more.",
    "More spread out from the centre means larger. Tightly clustered means "
    "smaller. That is the whole skill.",
    "Two sets can have the same mean and very different spreads - and that is "
    "usually the point of the question."]},
 ]},

{
 "id": "lesson-Q.D.", "skill_cd": "Q.D.",
 "title": "Two-variable data and scatterplots",
 "subtitle": "71 items",
 "sections": [
  {"id": "qd-what", "always": True,
   "heading": "Read the axes before anything else",
   "body": [
    "Ten seconds on what is measured, in what units, over what range. Most "
    "errors in this skill are made before any thinking starts.",
    "**Line of best fit questions are linear-function questions in disguise**: "
    "the slope is a rate per unit of x, the intercept is the value at x = 0."]},

  {"id": "qd-predict", "tier": "M",
   "heading": "Predicted versus actual",
   "body": [
    "*According to the line of best fit, what is the predicted value at x = 8?* "
    "Read the **line**, not the dots.",
    "*By how much does the actual value differ from the prediction?* Read "
    "**both**, and subtract.",
    "Getting these two confused is the standard error here. Underline whether "
    "the question says 'predicted' or 'actual'."]},

  {"id": "qd-hard", "tier": "H",
   "heading": "Choosing a model",
   "body": [
    "Roughly constant increase per step is **linear**. Increasingly steep, "
    "multiplying each step, is **exponential**. Rising then falling (or the "
    "reverse) is **quadratic**.",
    "You can also just type the table into Desmos and fit each candidate with "
    "`y_1 ~ mx_1 + b` and `y_1 ~ ab^{x_1}`, then compare how well each tracks "
    "the points."]},
 ]},

{
 "id": "lesson-Q.E.", "skill_cd": "Q.E.",
 "title": "Probability and conditional probability",
 "subtitle": "49 items, nearly all two-way tables",
 "sections": [
  {"id": "qe-what", "always": True,
   "heading": "The only difficulty is the denominator",
   "body": [
    "Probability is *the count you want over the total that could happen*. The "
    "arithmetic is trivial; picking the right total is the question.",
    "In a two-way table, find the number you want, then decide carefully "
    "whether the denominator is the **whole table**, one **row**, or one "
    "**column**."]},

  {"id": "qe-conditional", "tier": "M",
   "heading": "\"Given that\" changes the denominator",
   "body": [
    "*What is the probability a student plays an instrument, **given that** "
    "they are in year 11?* You are no longer looking at the whole table - only "
    "at the year 11 row.",
    "**The words after 'given that' tell you which row or column is now your "
    "entire world.** Circle that row before computing anything.",
    "Wrong answers are almost always the same numerator over the grand total."]},

  {"id": "qe-hard", "tier": "H",
   "heading": "Wording that reverses the fraction",
   "body": [
    "*Of the students who play an instrument, what fraction are in year 11?* is "
    "a different question from *of the year 11 students, what fraction play an "
    "instrument?* - same two numbers, denominators swapped.",
    "Read the phrase beginning **'of the'**: that group is the denominator."]},
 ]},

{
 "id": "lesson-Q.F.", "skill_cd": "Q.F.",
 "title": "Sample statistics and margin of error",
 "subtitle": "28 items - small pool, predictable questions",
 "sections": [
  {"id": "qf-what", "always": True,
   "heading": "Three facts cover almost all of it",
   "body": [
    "- **A margin of error gives an interval:** estimate ± margin. An estimate "
    "of 47% with a margin of 3% means the plausible range is 44% to 50%.",
    "- **A bigger sample gives a smaller margin.** That relationship is the "
    "most frequently tested idea in this skill.",
    "- **Conclusions only extend to the population actually sampled.** If the "
    "sample was drawn from one school, the conclusion is about that school."]},

  {"id": "qf-hard", "tier": "H",
   "heading": "Over-claiming",
   "body": [
    "The standard wrong answer states a result with more certainty than the "
    "interval supports, or extends it to a population that was never sampled.",
    "Prefer the cautious choice. In this skill the hedged answer is usually the "
    "correct one."]},
 ]},

{
 "id": "lesson-Q.G.", "skill_cd": "Q.G.",
 "title": "Evaluating statistical claims",
 "subtitle": "Only 12 items, but one rule answers nearly all of them",
 "sections": [
  {"id": "qg-what", "always": True,
   "heading": "Random assignment versus random selection",
   "body": [
    "This is the whole skill, and it is worth two minutes of your life:",
    "- **Random *selection*** (who is in the study) lets you **generalise** to "
    "the wider population.",
    "- **Random *assignment*** (who gets the treatment) lets you claim "
    "**cause**.",
    "An observational study has no random assignment, so it can never establish "
    "causation - however strong the association. Any answer choice claiming one "
    "thing *caused* another from an observational study is wrong.",
    "With only 12 items in the bank this will not decide your score, but it is "
    "the cheapest rule on the test to learn."]},
 ]},
]
