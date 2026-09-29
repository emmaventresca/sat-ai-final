# -*- coding: utf-8 -*-
"""Geometry and Trigonometry (domain S): 348 items, the most Hard-weighted
domain on the test. Circles and Right-Triangle Trigonometry have only 12 Easy
items between them (4 and 8), which is why the engine gates them behind
Medium mastery rather than serving them on frequency. Original writing."""

LESSONS = [

{
 "id": "lesson-S.B.", "skill_cd": "S.B.", "title": "Lines, angles, and triangles",
 "subtitle": "102 items - start here in Geometry",
 "sections": [
  {"id": "sb-what", "always": True,
   "heading": "The most balanced skill in the domain",
   "body": [
    "40 Easy, 29 Medium, 33 Hard - the only Geometry skill with a real Easy "
    "tier. If you are building a floor in Geometry, build it here rather than "
    "in circles or trigonometry.",
    "**Always mark the diagram.** Write every angle you work out onto the "
    "figure as you go. Geometry questions are chains, and the marked diagram is "
    "how you avoid restarting the chain."]},

  {"id": "sb-facts", "tier": "E",
   "heading": "The facts that actually get used",
   "body": [
    "- Angles in a triangle sum to **180**; on a straight line, **180**; around "
    "a point, **360**.",
    "- **Vertical angles are equal.** Where two lines cross, opposite angles "
    "match.",
    "- Parallel lines cut by a transversal: corresponding and alternate angles "
    "are **equal**, co-interior angles sum to **180**.",
    "- An exterior angle equals the **sum of the two opposite interior "
    "angles** - this shortcut saves a step constantly.",
    "- Isosceles triangles have equal base angles, and that is usually what "
    "unlocks the question."]},

  {"id": "sb-similar", "tier": "M",
   "heading": "Similar triangles",
   "body": [
    "Equal angles means similar, which means **corresponding sides are in "
    "proportion**.",
    "Set up the proportion with corresponding sides in matching positions, then "
    "cross-multiply. The usual error is pairing the wrong sides - so identify "
    "which angle each side is opposite before writing anything.",
    "A triangle sitting inside another with a parallel line across it is the "
    "standard setup, and it is worth recognising on sight."]},

  {"id": "sb-hard", "tier": "H",
   "heading": "Multi-step chains",
   "body": [
    "Hard items here are three or four easy steps stacked. There is no hard "
    "idea - the difficulty is entirely in not losing track.",
    "Work outward from whatever you were given, writing each new angle on the "
    "figure. If you stall, look for an isosceles triangle or a pair of parallel "
    "lines you have not used yet: the question always needs every piece of "
    "information it gave you."]},
 ]},

{
 "id": "lesson-S.A.", "skill_cd": "S.A.", "title": "Area and volume",
 "subtitle": "110 items - the largest Geometry skill",
 "sections": [
  {"id": "sa-what", "always": True,
   "heading": "The formulas are given to you",
   "body": [
    "There is a reference sheet in the app with every area and volume formula "
    "on it. **Do not memorise them, and do not work from memory** - open the "
    "sheet and read the formula.",
    "What is not on the sheet is knowing which one you need and what the "
    "question is really asking, and that is where the work is."]},

  {"id": "sa-method", "tier": "E",
   "heading": "The method",
   "body": [
    "1. Identify the shape and open the formula.",
    "2. Write down what each letter is, with units.",
    "3. Substitute, then solve.",
    "**Watch for radius versus diameter.** A question giving you the diameter "
    "and a formula wanting the radius is the most common trap in this skill, "
    "and it is deliberate. Halve it before substituting."]},

  {"id": "sa-scale", "tier": "M",
   "heading": "What scaling actually does",
   "body": [
    "Double every length and the **area goes up ×4**, the **volume ×8**. "
    "Lengths scale by k, areas by k², volumes by k³.",
    "This is tested directly and often, and guessing it wrong is a guaranteed "
    "loss. Multiply the scale factor by itself once for area, twice for volume.",
    "Composite figures: break them into shapes you have formulas for, then add "
    "or subtract. Shaded-region questions are almost always 'big shape minus "
    "small shape'."]},

  {"id": "sa-hard", "tier": "H",
   "heading": "Working backwards, and units",
   "body": [
    "Given a volume and asked for a dimension, substitute what you know and "
    "solve - do not try to rearrange the formula first, which is where sign and "
    "root errors come from.",
    "**Check the units in the answer choices.** Area is square units, volume "
    "cubic. If a question mixes centimetres and metres, convert before "
    "substituting, not after."]},
 ]},

{
 "id": "lesson-S.C.", "skill_cd": "S.C.",
 "title": "Right triangles and trigonometry",
 "subtitle": "Only 8 Easy items of 69 - a top-tier skill",
 "sections": [
  {"id": "sc-what", "always": True,
   "heading": "Where this sits for you",
   "body": [
    "69 items, of which 42 are Hard and just 8 are Easy. Along with circles, "
    "this is the most top-weighted skill on the test.",
    "If your target does not require the Hard tier, **this is a skill to leave "
    "alone** until everything cheaper is secure. The app will not put it in "
    "front of you until you have shown you own the Medium tier here, and that "
    "is deliberate rather than an oversight."]},

  {"id": "sc-basics", "tier": "M",
   "heading": "SOH-CAH-TOA, and the two triangles worth knowing",
   "body": [
    "sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = "
    "opposite/adjacent. Label the three sides **relative to the angle you are "
    "using** before writing any ratio - the same side is 'opposite' for one "
    "angle and 'adjacent' for the other.",
    "**Special triangles**, which appear constantly:",
    "- **30-60-90** has sides in the ratio 1 : √3 : 2",
    "- **45-45-90** has sides in the ratio 1 : 1 : √2",
    "Spotting these answers the question with no trigonometry at all.",
    "Also worth recognising: **3-4-5** and **5-12-13** right triangles, and "
    "their multiples."]},

  {"id": "sc-hard", "tier": "H",
   "heading": "The complementary angle identity",
   "body": [
    "**sin(x) = cos(90 − x).** This is tested directly and often, and it is the "
    "single highest-value fact in the skill.",
    "*If sin(a) = 0.6, what is cos(90 − a)?* The answer is 0.6, with no "
    "computation at all. Questions that look like they need a calculator "
    "frequently reduce to this identity.",
    "Make sure your calculator is in **degrees**, not radians, whenever you do "
    "compute."]},
 ]},

{
 "id": "lesson-S.D.", "skill_cd": "S.D.", "title": "Circles",
 "subtitle": "Only 4 Easy items of 67 - the most top-weighted skill on the test",
 "sections": [
  {"id": "sd-what", "always": True,
   "heading": "Where this sits for you",
   "body": [
    "67 items: 41 Hard, 22 Medium, and **4 Easy**. There is no cheap tier here "
    "at all.",
    "That makes circles a genuine trap in planning. It *feels* like a topic you "
    "should study because it is distinctive and has its own formulas - but "
    "unless you are going for a top score, the same hours spent on Linear "
    "Functions or Words in Context buy several times the points.",
    "If your target needs it, the material below is the whole skill."]},

  {"id": "sd-equation", "tier": "M",
   "heading": "The equation of a circle",
   "body": [
    "**(x − h)² + (y − k)² = r²**, centre (h, k), radius r.",
    "Two things to be careful about, and they account for most losses here:",
    "- The **signs are flipped**: (x − 3)² means the centre's x is +3.",
    "- The right side is **r squared**. If it says 25, the radius is 5, not 25.",
    "**Desmos:** type the equation straight in and look at it. The centre and "
    "radius are visible immediately, which beats reading them off by eye."]},

  {"id": "sd-complete", "tier": "H",
   "heading": "Completing the square",
   "body": [
    "When the equation arrives as x² + y² + 6x − 4y = 12, it has to be "
    "rearranged into centre-radius form. Halve the coefficient of x, square it, "
    "add to both sides; repeat for y.",
    "**Or type it into Desmos exactly as given** and read the centre off the "
    "graph. Desmos plots implicit equations, so this works, and it is far "
    "faster than the algebra under time pressure."]},

  {"id": "sd-arcs", "tier": "H",
   "heading": "Arcs, sectors, and radians",
   "body": [
    "An arc or sector is just a **fraction of the whole circle**, and the "
    "fraction is (central angle / 360).",
    "- arc length = (angle/360) × 2πr",
    "- sector area = (angle/360) × πr²",
    "Do not memorise these as separate formulas - find the fraction, then take "
    "that fraction of the circumference or the area.",
    "**Radians:** a full circle is 2π. Multiply by 180/π to get degrees, by "
    "π/180 to go the other way. Arc length in radians is simply rθ."]},
 ]},
]
