# -*- coding: utf-8 -*-
"""Algebra (domain H): 616 items, the most Easy-weighted domain on the test.

Desmos-first throughout. The built-in graphing calculator replaces most of the
hand algebra these questions were historically written for, and the students who
use it finish the section. Original instructional writing."""

LESSONS = [

{
 # Cross-cutting: not tied to one skill, so it is pinned to the top of the math
 # list rather than ranked by the engine's frequency term.
 "id": "lesson-DESMOS", "skill_cd": None, "section": "math", "pinned": True,
 "type": "strategy",
 "title": "Desmos: the moves that replace algebra",
 "subtitle": "Read this before any other math lesson",
 "sections": [
  {"id": "des-why", "always": True,
   "heading": "Why this comes first",
   "body": [
    "Every math question gives you a built-in Desmos graphing calculator. Most "
    "students use it as a calculator. It is a solver.",
    "The moves below turn whole categories of question into 'graph it and click "
    "the dot'. They are not shortcuts for weak students - they are faster and "
    "more accurate than algebra for almost everyone, and they free the time you "
    "need for the questions that really are hard."]},

  {"id": "des-core", "always": True,
   "heading": "The one move worth more than all the others",
   "body": [
    "Any equation of the form **f(x) = g(x)**:",
    "- type `y = ` the left side on line 1",
    "- type `y = ` the right side on line 2",
    "- click the grey intersection dot",
    "The x-coordinate is your solution. This handles linear equations, "
    "quadratics, radicals, absolute value, exponentials and rational equations "
    "- without changing technique.",
    "**Cleaner variant:** graph `y = (left) - (right)` on one line and click the "
    "x-intercept. Same answer, half the clutter, and it makes 'how many "
    "solutions' obvious at a glance."]},

  {"id": "des-dots", "always": True,
   "heading": "Grey dots are the whole game",
   "body": [
    "Desmos marks every intersection, x-intercept, y-intercept, vertex, maximum "
    "and minimum with a clickable grey dot, and clicking prints exact "
    "coordinates.",
    "You almost never need to compute a vertex, a root, or a maximum by hand. "
    "If a question asks for one, graph and click."]},

  {"id": "des-slider", "tier": "M",
   "heading": "Sliders for unknown coefficients",
   "body": [
    "When a question puts a letter in the equation - *for what value of a does "
    "this have no solution* - type the equation with `a` in it and Desmos will "
    "offer to add a slider.",
    "Drag it and watch. 'No solution' is the moment the lines become parallel. "
    "'Infinitely many' is the moment they lie on top of each other. 'Exactly "
    "one' is the moment a curve becomes tangent.",
    "This converts the hardest algebra questions on the test into something you "
    "can see."]},

  {"id": "des-systems", "tier": "E",
   "heading": "Systems: type both lines",
   "body": [
    "Two equations, two unknowns: type both, click the intersection. Done.",
    "Do not solve by substitution or elimination unless the question asks for "
    "something other than the solution itself.",
    "If the lines never meet, there is no solution. If they are the same line, "
    "there are infinitely many. You can see which instantly."]},

  {"id": "des-table", "tier": "M",
   "heading": "Tables and regressions",
   "body": [
    "Given a table of values, type it into a Desmos **table** and then fit it. "
    "`y_1 ~ mx_1 + b` gives you the linear model; `y_1 ~ ab^{x_1}` gives you "
    "the exponential one.",
    "Desmos reports m and b directly. This answers 'which equation models the "
    "data' questions without any algebra at all."]},

  {"id": "des-when-not", "tier": "H",
   "heading": "When not to reach for it",
   "body": [
    "Desmos is slower than thinking when the question is **symbolic** - *which "
    "expression is equivalent to*, or anything where the answer choices are "
    "expressions rather than numbers.",
    "For those, a good fallback is to **pick a number**: substitute x = 2 into "
    "the original and into each choice, and keep whichever matches. Avoid 0 and "
    "1, which make too many things agree."]},
 ]},

{
 "id": "lesson-H.A.", "skill_cd": "H.A.", "title": "Linear equations in one variable",
 "subtitle": "112 items, and the cheapest points on the test",
 "sections": [
  {"id": "ha-what", "always": True,
   "heading": "The shape of the question",
   "body": [
    "One variable, one equation, solve for it. At the Easy tier this is "
    "genuinely just algebra, and it should be automatic before you spend time "
    "anywhere else.",
    "**Desmos:** graph both sides, click the intersection."]},

  {"id": "ha-special", "tier": "M",
   "heading": "The two special cases you must recognise",
   "body": [
    "These come up constantly and they are worth memorising as **signals**:",
    "- **'no solution'** - the variable terms match but the constants do not. "
    "Set the coefficients of x equal and solve for the unknown constant. "
    "Graphically: parallel lines.",
    "- **'true for all values of x' / 'infinitely many solutions' / "
    "'identity'** - both sides must be literally identical. Match the "
    "x-coefficients **and** match the constants. Graphically: the same line "
    "twice.",
    "With a slider on the unknown, both are something you watch happen rather "
    "than solve."]},

  {"id": "ha-hard", "tier": "H",
   "heading": "Variables in denominators",
   "body": [
    "When x appears in the bottom of a fraction, graph both sides and click the "
    "intersection - but then check the graph for a hole or a vertical "
    "asymptote.",
    "**Any value that makes a denominator zero is not a solution**, even if it "
    "falls out of the algebra. This exclusion is the entire point of the "
    "question at this tier."]},
 ]},

{
 "id": "lesson-H.B.", "skill_cd": "H.B.", "title": "Linear functions",
 "subtitle": "170 items - the largest single skill in Algebra",
 "sections": [
  {"id": "hb-what", "always": True,
   "heading": "Everything is y = mx + b",
   "body": [
    "m is the rate of change, b is the value when x is 0. Nearly every question "
    "in this skill is a different way of handing you m and b.",
    "Your job is usually just to identify which two pieces of information you "
    "have been given, and in what disguise."]},

  {"id": "hb-signals", "tier": "E",
   "heading": "The disguises",
   "body": [
    "- **'slope 3, passes through (0, -8)'** - an x-coordinate of 0 *is* the "
    "y-intercept. Write y = 3x - 8 immediately, no point-slope needed.",
    "- **'f(0) = 41 and f(1) = 40'** - f(0) is b. The step from 41 to 40 is m. "
    "So y = -x + 41. This exact setup appears constantly; learn to read f(0) as "
    "b on sight.",
    "- **a word problem with a starting amount and a per-unit change** - the "
    "starting amount is b, the per-unit change is m.",
    "- **two arbitrary points** - now you do need slope = rise over run, then "
    "substitute back for b."]},

  {"id": "hb-interpret", "tier": "M",
   "heading": "Interpretation questions",
   "body": [
    "*What does the 12 represent in the equation C = 12h + 45?*",
    "The coefficient on the variable is always a **rate**: per hour, per item, "
    "per year. The constant is always a **starting or fixed amount**.",
    "Check the units in the answer choices. The right answer's units are the "
    "y-units divided by the x-units for m, and plain y-units for b. Wrong "
    "choices usually get the units backwards."]},

  {"id": "hb-struggle", "when": {"struggling": {"tier": "E", "below": 0.7}},
   "heading": "If these are going wrong",
   "body": [
    "Almost always one of two things:",
    "1. **Mixing up m and b.** Write down which is which before touching the "
    "choices: *b is where it starts, m is how fast it changes*.",
    "2. **Sign errors on negative slopes.** If the quantity is going down, m is "
    "negative. Check that your answer's direction matches the story before "
    "you commit."]},
 ]},

{
 "id": "lesson-H.C.", "skill_cd": "H.C.",
 "title": "Linear equations in two variables",
 "subtitle": "130 items",
 "sections": [
  {"id": "hc-what", "always": True,
   "heading": "One equation, two variables",
   "body": [
    "A single equation in x and y does not have one solution - it has a line of "
    "them. So the question is never 'solve it'. It is one of:",
    "- find y when x is given (substitute)",
    "- find the slope or an intercept (rearrange to y = mx + b)",
    "- match the equation to a graph or a situation",
    "Identify which of those three you have before you start working."]},

  {"id": "hc-forms", "tier": "E",
   "heading": "The three forms, and what each hands you free",
   "body": [
    "- **y = mx + b** gives you slope and y-intercept by inspection.",
    "- **Ax + By = C** gives you intercepts fastest: set x = 0 for the "
    "y-intercept, y = 0 for the x-intercept.",
    "- **y - y1 = m(x - x1)** gives you a point and the slope.",
    "You do not have to convert. Read whichever form you were given for what "
    "it already tells you - conversion is where errors come from."]},

  {"id": "hc-intercepts", "tier": "M",
   "heading": "Intercepts in context",
   "body": [
    "In a word problem the **y-intercept is the starting value** (x = 0: no "
    "time elapsed, nothing bought) and the **x-intercept is when the quantity "
    "runs out** (y = 0: no money left, no fuel remaining).",
    "Questions asking 'after how many weeks will she have spent it all' are "
    "x-intercept questions in disguise. Graph it and click the x-intercept."]},
 ]},

{
 "id": "lesson-H.D.", "skill_cd": "H.D.",
 "title": "Systems of two linear equations",
 "subtitle": "126 items",
 "sections": [
  {"id": "hd-what", "always": True,
   "heading": "Graph both, click the dot",
   "body": [
    "If the question wants the solution, type both equations into Desmos and "
    "click the intersection. There is no faster method and no more reliable "
    "one.",
    "Solve by hand only when the question asks for something else - *what is "
    "x + y*, or *for what value of k*."]},

  {"id": "hd-count", "tier": "M",
   "heading": "How many solutions",
   "body": [
    "This is a slope question, not a solving question:",
    "- **different slopes** - exactly one solution (the lines cross)",
    "- **same slope, different intercept** - no solution (parallel)",
    "- **same slope, same intercept** - infinitely many (the same line)",
    "Put both in y = mx + b form and compare. With a letter in the equation, "
    "put a slider on it and drag until the lines become parallel."]},

  {"id": "hd-word", "tier": "M",
   "heading": "Word problems: name the variables first",
   "body": [
    "Write *x = ___* and *y = ___* in words before writing any equation. Most "
    "errors in this skill are setup errors, not algebra errors.",
    "Then look for the two relationships. Almost always one is a **count** "
    "(how many things) and the other is a **total value** (cost, weight, time). "
    "That pairing is the standard structure."]},
 ]},

{
 "id": "lesson-H.E.", "skill_cd": "H.E.",
 "title": "Linear inequalities",
 "subtitle": "78 items",
 "sections": [
  {"id": "he-what", "always": True,
   "heading": "Same as equations, with one rule and one habit",
   "body": [
    "**The rule:** multiplying or dividing by a negative flips the inequality "
    "sign. This is the only thing that makes inequalities different from "
    "equations, and forgetting it is the most common error in the skill.",
    "**The habit:** Desmos shades inequalities. Type it in and look at which "
    "region is shaded, then test a point from the answer choices."]},

  {"id": "he-system", "tier": "M",
   "heading": "Systems of inequalities",
   "body": [
    "Type both. The overlap of the two shaded regions is the solution set.",
    "When asked *which point is a solution*, do not reason about it - graph "
    "both inequalities and see which of the four points lands in the overlap.",
    "When asked which *system* a graph represents, check two things: the "
    "boundary lines, and which side of each is shaded."]},

  {"id": "he-word", "tier": "H",
   "heading": "Translating the words",
   "body": [
    "*At least* and *no less than* are **≥**. *At most* and *no more than* are "
    "**≤**. *More than* and *fewer than* are strict.",
    "These phrases decide the answer more often than the algebra does. Underline "
    "them in the question before you start."]},
 ]},
]
