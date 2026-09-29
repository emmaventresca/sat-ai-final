# -*- coding: utf-8 -*-
"""Advanced Math (domain P): 540 items, the second-largest math domain and the
most Hard-weighted after Geometry. Desmos-first. Original writing."""

LESSONS = [

{
 "id": "lesson-P.C.", "skill_cd": "P.C.", "title": "Nonlinear functions",
 "subtitle": "259 items - the largest single skill in Math",
 "sections": [
  {"id": "pc-what", "always": True,
   "heading": "Quadratics, exponentials, and reading a graph",
   "body": [
    "The biggest skill in the whole math section. Most of it is quadratics, "
    "and most quadratic questions are asking for one of four things: the "
    "**roots**, the **vertex**, the **y-intercept**, or the **number of "
    "solutions**.",
    "Every one of those is a grey dot in Desmos. Graph it, click the dot, read "
    "the coordinates. You almost never need the quadratic formula."]},

  {"id": "pc-forms", "tier": "E",
   "heading": "Each form hands you one answer free",
   "body": [
    "This is the single most useful thing to know about quadratics on this "
    "test:",
    "- **Standard, y = ax² + bx + c** - c *is* the y-intercept.",
    "- **Factored, y = a(x - p)(x - q)** - p and q *are* the roots.",
    "- **Vertex, y = a(x - h)² + k** - (h, k) *is* the vertex.",
    "So the question 'which form displays the vertex as constants' answers "
    "itself once you know the three names. These appear constantly and are free "
    "points.",
    "Also: **a positive opens upward** (the vertex is a minimum), a negative "
    "opens downward (a maximum)."]},

  {"id": "pc-vertex", "tier": "M",
   "heading": "The vertex, without completing the square",
   "body": [
    "The vertex sits exactly halfway between the two roots. So if you can see "
    "the roots, average them for the x-coordinate and substitute back for the "
    "y.",
    "Algebraically it is x = -b/(2a), but you rarely need that. **Graph it and "
    "click the vertex dot.**",
    "'Maximum height', 'minimum cost', 'greatest area' are all vertex questions "
    "in words. Recognise the wording and go straight to the dot."]},

  {"id": "pc-exp", "tier": "M",
   "heading": "Exponential growth and decay",
   "body": [
    "**y = a·b^x.** a is the starting value, b is the multiplier per step.",
    "- b > 1 is growth; b < 1 is decay.",
    "- *increases by 8%* means b = 1.08. *decreases by 8%* means b = 0.92.",
    "The most common error is writing 0.08 instead of 1.08. Read b as 'what I "
    "multiply by each time', which can never be near zero for growth.",
    "**Linear versus exponential:** a constant *amount* added each time is "
    "linear; a constant *percentage* is exponential. That phrase is the test."]},

  {"id": "pc-struggle", "when": {"struggling": {"tier": "M", "below": 0.65}},
   "heading": "If these keep going wrong",
   "body": [
    "Check whether you are answering the question that was asked. In this "
    "skill specifically:",
    "- asked for the **vertex** but gave only the x-coordinate",
    "- asked for the **roots** but gave the factors (x - 3 rather than 3)",
    "- asked when height is **zero** (a root) but found the maximum instead",
    "Underline the thing being asked for before you graph anything, and check "
    "your answer against it at the end."]},

  {"id": "pc-hard", "tier": "H",
   "heading": "Discriminant and parameter questions",
   "body": [
    "*For what value of k does this have exactly one solution?* That is a "
    "**tangency** question. Put a slider on k and drag until the curve just "
    "touches the line - one intersection dot.",
    "Algebraically it is the discriminant b² - 4ac: positive gives two "
    "solutions, zero gives one, negative gives none. Know it, but reach for the "
    "slider first, because it is faster and you can see when you are right."]},
 ]},

{
 "id": "lesson-P.B.", "skill_cd": "P.B.",
 "title": "Nonlinear equations and systems",
 "subtitle": "165 items, and heavily Hard-weighted",
 "sections": [
  {"id": "pb-what", "always": True,
   "heading": "One move handles nearly all of it",
   "body": [
    "Graph the left side, graph the right side, click the intersections. This "
    "works for quadratics, radicals, absolute value, rational equations and "
    "systems mixing a line with a curve - the same technique every time.",
    "**'How many solutions'** is then just counting intersection dots, which is "
    "far more reliable than reasoning about it."]},

  {"id": "pb-extraneous", "tier": "M",
   "heading": "Extraneous solutions",
   "body": [
    "When you square both sides of a radical equation, or clear a denominator, "
    "you can create solutions that do not satisfy the original.",
    "**The graph never lies.** If the algebra gives you x = 2 and x = 5 but the "
    "graphs only cross once, only that crossing is a real solution.",
    "This is the entire point of many Medium and Hard items in this skill, so "
    "always check the count against the picture."]},

  {"id": "pb-hard", "tier": "H",
   "heading": "Systems of a line and a curve",
   "body": [
    "A line and a parabola meet twice, once, or not at all. Questions asking "
    "*for what value of c does the system have exactly one solution* are "
    "tangency questions - slider on c, drag until they just touch.",
    "When the answer choices are **expressions rather than numbers**, Desmos "
    "stops helping. Fall back to substituting a specific value of x into the "
    "original and into each choice, and keep whichever matches. Avoid 0 and 1."]},
 ]},

{
 "id": "lesson-P.A.", "skill_cd": "P.A.", "title": "Equivalent expressions",
 "subtitle": "116 items - the one place Desmos does not help",
 "sections": [
  {"id": "pa-what", "always": True,
   "heading": "Symbolic, so use a different tool",
   "body": [
    "*Which expression is equivalent to...* - the answer choices are "
    "expressions, not numbers, so there is nothing to graph and click.",
    "**Pick a number instead.** Substitute x = 2 into the original, then into "
    "each choice, and keep the ones that match. Avoid 0 and 1, which make too "
    "many wrong choices agree, and avoid any value that makes a denominator "
    "zero.",
    "If two choices survive, try a second number. This is faster and far more "
    "reliable than doing the algebra under time pressure."]},

  {"id": "pa-rules", "tier": "M",
   "heading": "The rules actually tested",
   "body": [
    "- **Exponents:** x^a · x^b = x^(a+b); (x^a)^b = x^(ab); x^(-a) = 1/x^a.",
    "- **Fractional exponents:** x^(1/2) is √x, x^(2/3) is the cube root of x², "
    "which is the most commonly tested conversion.",
    "- **Difference of squares:** a² - b² = (a + b)(a - b). Recognising this on "
    "sight saves whole questions.",
    "- **Rational expressions:** factor first, then cancel. Never cancel across "
    "an addition sign."]},

  {"id": "pa-hard", "tier": "H",
   "heading": "When picking a number is awkward",
   "body": [
    "With two variables, pick two different numbers - say x = 2 and y = 3. "
    "Using the same value for both is how you get two choices matching.",
    "For expressions with several restricted values, choose something "
    "deliberately unusual like x = 5 or x = 7. The traps are usually built "
    "around small numbers."]},
 ]},
]
