# Felistas portfolio: UI/UX specification ("Dusk")

This document describes the approved design completely enough that a person or an AI agent can rebuild it without having seen the design conversations.

**Source of truth, in order:**

1. `docs/ui/Felistas Dusk.html`: the approved, working prototype. Open it in a browser to see every behaviour. When this spec and the prototype disagree on an exact value, the prototype wins.
2. This file: the intent, the rules and the values pulled out of the prototype, plus the parts the prototype cannot show (real Gemini, real email, real download).
3. `docs/ui/Felistas Dusk.md`: an automatic text export of the page. It holds almost nothing and can be ignored.

The prototype's content (projects, jobs, education, email, links) is **sample content**. The real content lives in `content/` (Markdown + frontmatter, validated with zod) and must be swapped in before launch.

---

## 1. Concept

A portfolio for Felistas, a software engineer, that feels like talking to a calm AI that lives in the dark.

- **One continuous dark field.** The whole page sits on a live field of monospace glyphs (a "Matrix" texture, but calm). Nothing is boxed off: there are no panels, cards or dividers between the AI and the content.
- **The Glyphsphere.** A rotating 3D sphere made of the same glyphs is the AI companion, called **Dusk**. It is huge on the first screen, then settles at the top of the left column and stays large. It looks at the cursor, pulses when it speaks, and changes shape for every section.
- **The page comes out of the sphere.** Glyphs stream off the sphere into the label of the section in view, and each section heading flies out of the sphere letter by letter.
- **The AI is a real tool.** Visitors can ask about Felistas, download the resume, jump to a section, or leave a message. Recruiters and developers should be able to do everything through the chat.

Tone: calm, cinematic, precise. It should impress developers but never blind or overwhelm. Motion has three levels and visitors choose.

---

## 2. Design tokens

### Colour (single dark theme by design; there is no light mode)

| Token     | Value                    | Use                                                         |
| --------- | ------------------------ | ----------------------------------------------------------- |
| `--bg`    | `#110b10` (rgb 17,11,16) | Page ground; also used for text shadows and scrims          |
| `--fg`    | `#f1e7ec`                | Primary text                                                |
| `--fg2`   | `#cdb9c3`                | Body text                                                   |
| `--muted` | `#9a8490`                | Labels, meta, placeholders                                  |
| `--line`  | `rgba(226,166,182,.16)`  | Hairlines (only thin rules, never boxes)                    |
| `--acc`   | `#e2a6b6`                | Dusty rose accent: links, dots, highlights, the send button |
| `--acc2`  | `#fbe3ea`                | Brightest highlight (glyph light, the "now" edge)           |
| `--ink`   | `#24101a`                | Text on accent backgrounds                                  |
| `--soft`  | `rgba(226,166,182,.11)`  | Hover washes, status rings                                  |

Canvas palettes (RGB):

- Glyph base (dim field): `#2b1c26`, `#45293a`, `#1f141b`
- Glyph highlight (name and lit cells): `#c88ca0`, `#f4dce4`, `#e2a6b6`
- Light (cursor glow, sphere front): `#fbe3ea`
- Accent: `#e2a6b6`

### Typography

| Role               | Family                                                                                                        | Notes                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Display / voice    | **Instrument Serif** (400, normal + italic)                                                                   | Section headings, the AI's messages, big numbers, the contact letter                    |
| UI / body          | **Geist** (300, 400, 500)                                                                                     | Body copy, nav, chips                                                                   |
| Utility / data     | **Geist Mono** (400, 500)                                                                                     | Eyebrows, labels, meta, the glyph field and sphere                                      |
| Glyph-mask display | **Big Shoulders** at weight 900 (the prototype uses "Big Shoulders Display", now merged into "Big Shoulders") | Only used to rasterise words into the glyph field, plus the outlined years in Education |

Scale (from the prototype):

- Section `h2`: `clamp(46px, 5.6vw, 92px)`, line-height .95, letter-spacing -.015em.
- About statement: `clamp(36px, 4.4vw, 68px)`.
- Hero sub-line: `clamp(24px, 2.3vw, 34px)`.
- AI message: 20px serif, line-height 1.38.
- Body: 15.5px, line-height 1.75, max width 58ch.
- Eyebrow: 11px mono, letter-spacing .18em, uppercase, accent colour.

Headings use `text-wrap: balance`. In `next/font`, every family is exposed as a CSS variable: `--ff-sans`, `--ff-mono`, `--ff-serif`, `--ff-display` (Tailwind maps them to `font-sans`, `font-mono`, `font-serif`, `font-display`). The canvases need the **real** font-family string, so read it from the CSS variable at runtime (`getComputedStyle(document.documentElement).getPropertyValue('--ff-display')`). Never hard-code the family name in canvas code, because `next/font` renames families.

### Layout

- `--col: clamp(340px, 30vw, 440px)`: the width of the companion column on desktop (`clamp(230px, 34vw, 340px)` from 600 to 899px).
- The breakpoints are **600px** (below it, phones get the bottom sheet) and **900px** (two-column section details). See §9.
- Content padding: `96px clamp(24px,5vw,80px) 72px clamp(20px,2.6vw,40px)`. Content max width is 1060px.

---

## 3. Stage structure (z-order, back to front)

1. **Glyph field canvas**: full viewport.
2. **Veil**: a `--bg` layer whose opacity is `k × 0.38`, where `k` is the eased intro-to-content scroll progress (§5.1). It dims the field once you leave the intro without hiding it.
3. **Content scroller**: right of the column, with vertical **mandatory scroll snap**, one section per screen (`min-height: 100%`).
4. **Companion column**: no background panel and no border. Only a horizontal gradient, `rgba(bg,.9) 0% → rgba(bg,.78) 62% → transparent 100%`, so the glyphs show through behind the chat.
5. **Sphere canvas**: full viewport with `pointer-events: none`. It draws the sphere, the glyph streams and the flying heading letters.
6. **Top bar**: transparent, no band. It holds the brand `felistas.dev` (mono, `.dev` muted), the section nav (13px; the active item gets a 1px accent underline), the Motion switch (`Still / Calm / Lively`), and a 1px accent scroll-progress line along the very top.
7. Toasts.

---

## 4. The glyph field

The prototype implements this as `class Glyphs`.

- **Grid.** Cells are 10×18 px with a 14px Geist Mono font on desktop, and 7×13 px with 11px below 640px wide. Each cell has a character, a current colour, a target colour and a highlight colour.
- **Living texture.** Every 45 ms a fraction of the cells (set by the motion level, §7) get a new random glyph and a new base colour. The colour eases over about 14 frames. The character set is `A–Z 0–9 ! @ # $ & * ( ) - _ + = / [ ] { } ; : < > ,`.
- **Frame rate.** The field redraws at about 30 fps.
- **Word mask.** A word is rasterised in Big Shoulders 900 onto an offscreen canvas with one pixel per cell. Cells inside the letters get `mt = 1`. Each cell eases `m → mt` at its own speed (0.05–0.14 per frame), so words dissolve and re-form organically. A lit cell's colour is `lerp(base, highlight, m × strength)`.
  - Intro: the word is **FELISTAS**, placed in the content area at y = 40% of the height, up to 90% of the content width and 42% of the height. On mobile it sits at y = 42%, 92% of the width and 13% of the height.
  - `strength = clamp(1 − k × 1.2)`, so the name fades as you leave the intro.
  - **Flash words.** Hovering a project name shows that name in the field for 3.2 s, and hovering a skill shows the skill for 2.2 s. Flash words sit lower and to the right (desktop: x at 62% of the content area, y 62%, width 62%, height 26%) at a strength of at least 0.42, then FELISTAS re-forms.
- **Brightness.** The base colour is multiplied by `motion.dim × lerp(1, .95, k)`.
- **Lights** (additive blend toward a light colour):
  - Cursor: radius 150, strength from the motion level (§7). Cells inside the name get 1.5× strength, capped at 0.9.
  - Sphere: centred on the sphere, radius `R × 1.9 + speak × 60`, strength `.16 + speak × .18`, in highlight colour 1.
- **Repel (Dusk's signature).** Cells within 140 px of the cursor are pushed away along the cursor→cell vector by `(1 − d/140) × 18` px, so the glyphs part around the cursor like water.

---

## 5. The Glyphsphere (Dusk)

The prototype implements this as `class Sphere`.

- **Points.** 380 on desktop, 240 below 700px wide. They start in a Fibonacci-sphere layout. Each point carries its own glyph, and 4 + (speak × 14) points swap glyphs every 70 ms.
- **Rotation.** Yaw advances by `.0035 × motion.spin + speak × .006 + think × .02` per frame. Pitch rests at .38.
- **Gaze.** The sphere turns toward the cursor: yaw offset up to ±.55 rad and pitch offset up to ±.45 rad, eased at 5% per frame.
- **Depth shading.** For depth `d ∈ [0,1]` (back to front):
  - Colour: base when d ≤ .45, highlight 1 when .45 < d ≤ .78, light when d > .78.
  - Alpha: `.12 + d × .82`.
  - Glyph size: `max(6, round(R/13 × (.5 + d × .65)))` px Geist Mono.
  - When R < 40 (the mobile dock), draw small squares instead of glyphs.
- **Halo.** A radial accent glow from 0.2R to 1.7R, with alpha `.08 + speak × .07`.
- **States** (driven by the chat):
  - _thinking_: the radius shrinks 15%, the sphere spins faster, and an accent arc (1.3 rad long) orbits at 1.22R + 4.
  - _speaking_: a ripple runs through the points, `radius × (1 + speak × .05 × sin(y × 7 + t × .008))`.
- **Shapes per section ("dispatch and combine").** Whenever the current section changes, every point gets a new target. The points burst outward and then recombine into the new form:

  | Section    | Shape             |
  | ---------- | ----------------- |
  | home       | sphere            |
  | about      | torus             |
  | projects   | cube surface      |
  | experience | double helix      |
  | education  | three flat rings  |
  | contact    | envelope (letter) |
  - Each point eases toward its target at its own speed (0.025–0.075 per frame).
  - `burst` starts at 1 and decays ×0.972 per frame. The outward push is `1 + sin(π(1 − burst)) × j × .85`, where `j` is a per-point random value in .5–1.6. Alpha dips by up to 35% during the burst.
  - The shape name shows under the companion's name as `form · helix` (mono, 10px, accent).
  - Shape formulas are in the prototype's `SHAPES` object.

### 5.1 Position: intro to docked

Let `k = smoothstep(clamp(scrollTop / (viewportHeight × .6)))`.

- **Desktop**
  - Intro: centre `(col/2, H × .33)`, radius `min(col × .42, H × .29)`.
  - Docked: centre `(col/2, 64 + Rd)`, radius `Rd = min(col × .30, H × .17)`. The sphere **stays big**; it never shrinks to an avatar.
  - The sphere's position and radius interpolate between the two by `k`.
  - The column's top padding (`--lift`) interpolates from `intro.y + Rh + H × .06` to `dock.y + Rd + 34`, so the conversation moves up under the sphere and gets taller.
- **Mobile.** The intro sphere sits at `(W/2, H × .2)` with radius `min(W × .27, H × .13)`. It docks into the 40px slot in the bottom sheet header at radius 17.

### 5.2 Glyph streams

When `k > .9` on desktop and the current section has an `[data-anchor]` eyebrow inside the viewport, glyphs leave the sphere and feed that eyebrow. There is no line.

- Each glyph is lifted off the sphere: a lit, front-facing point on the side nearest the eyebrow, with its own character and size. It ends just left of the eyebrow.
- The path follows the sphere's form (`streams.ts`):

  | Form               | Path                                                                            |
  | ------------------ | ------------------------------------------------------------------------------- |
  | torus (About)      | spiral: three coils winding around the path                                     |
  | cube (Projects)    | circuit: right-angle traces that hop forward in eight steps, like data on a bus |
  | helix (Experience) | helix: two strands half a turn apart                                            |
  | ring (Education)   | orbit: rides a flat ring around the sphere, then slingshots off its top         |
  | letter (Contact)   | glide: a high arc, then a paper-plane descent with a little sway                |

- Glyphs shrink to 11px and get a short two-copy tail. In the last fifth of the path they turn accent and decode into letters of the eyebrow's word.
- An accent dot (r 2.5) marks the end and swells briefly as each glyph lands.
- Lively emits every 70 ms (1.75 s flights), Calm every 110 ms (2.3 s). Still draws a few frozen glyphs along each path, with no motion.
- The stream fades in and out at 8% per frame and finishes fading from one section before it starts on the next.

### 5.3 Headings fly out of the sphere

This applies to every section heading marked `data-fly`: the About statement and the `h2` of Projects, Experience, Education and Contact.

- Before a section is entered, its heading has opacity 0 (`.flying`).
- On entering (by scroll, nav click or AI navigation), split the heading's text nodes into characters and get each character's live rectangle with a DOM `Range`.
- Each character launches from a random point inside the sphere, delayed by `index × 24 ms`, and flies for 950 ms along a quadratic curve that arcs above both points.
- In flight the character is a cycling random glyph in highlight colour. Its size grows from `max(9, R × .11)` to the heading's font size.
- After 72% of the flight it becomes the real character, in the real colour and font (italic spans keep their italics and accent colour).
- When the last character lands, `.flying` is removed: the real heading fades in over .45 s and the canvas letters fade out over .38 s.
- Leaving a section re-hides its heading, so the effect replays every time you return.
- Re-read the character rectangles **every frame** so landing stays exact while the page is still scrolling.
- With Still motion or reduced motion, headings never hide or fly.

### 5.4 Current-section detection

Compute the current section from the scroll position **every frame**: the last section whose `offsetTop ≤ scrollTop + 45% of the viewport`. Do not rely on `IntersectionObserver` for this. During testing it did not fire in headless Chrome, which would have left headings hidden.

---

## 6. The companion (chat)

The column contains, top to bottom:

1. The sphere area.
2. **Who line**, centred: "Dusk" (serif 28px), then the status (mono 10.5px uppercase: a dot plus `Listening` / `Thinking` / `Responding`), then `form · <shape>`. A start-over icon button sits to the right.
3. **Log**: fills the remaining height, scrolls, and has a 28px fade at the top.
4. **Chips**: suggestion pills (12.5px, `rgba(acc,.07)` fill, no border).
5. **Composer**: borderless except a bottom hairline that turns accent on focus. Placeholder "Ask Dusk about Felistas…". Round accent send button (34px).
6. **Footer**: "Enter to send" and the model label, both in mono 10px.

Message styles:

| Type        | Style                                                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI          | Instrument Serif 20px, revealed word by word every 28 ms, with a bg-coloured text shadow for legibility over glyphs                                                    |
| Visitor     | Right-aligned bubble with `rgba(acc,.13)` fill and radius `16 16 5 16`                                                                                                 |
| Tool call   | A small mono line: a round `ƒ` badge, `navigate("projects")`, then `done` in accent. Show this for every function call, because it makes the AI feel like a real agent |
| Typing      | Three pulsing dots, shown during the think delay                                                                                                                       |
| Resume card | Accent left rule; a PDF icon; `felistas-resume.pdf · 2 pages · 148 KB · <date>`; a "Download" text link                                                                |
| Draft card  | Accent left rule; To / Reply to / Message rows; Send · Edit · Cancel text links                                                                                        |

**Greeting:** "Hello. I'm Dusk, and I keep the record of Felistas, a software engineer. Who's visiting today?"

**Opening chips:** `I'm a recruiter`, `I'm a developer`, `Download resume`, `Show projects`.

### 6.1 Agent behaviour and tools (production)

The prototype uses a local keyword matcher (`makeAgent`). In production, the model is **Gemini (free tier) through the Vercel AI SDK with tool calling**, streamed from the server (`POST /api/chat`). The API key never reaches the browser.

The model must answer **only from the record**: a short core card plus the chunks retrieved for each question from an index built from `content/` (hybrid BM25 + Gemini embeddings), cited as sources. It speaks in short, plain, calm sentences, in the third person about Felistas, with no hype.

Tools (function declarations):

| Tool              | Args                                                             | Effect (executed on the client unless noted)                                  |
| ----------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `navigate`        | `section: home\|about\|projects\|experience\|education\|contact` | Scroll to the section (this triggers the shape change and the heading flight) |
| `open_project`    | `id`                                                             | Navigate to Projects and select that project (detail panel plus glyph flash)  |
| `open_role`       | `org`                                                            | Navigate to Experience and select that role                                   |
| `download_resume` | —                                                                | Show the resume card and start the download of `/resume/felistas-resume.pdf`  |
| `draft_message`   | `reply_to` (email), `name?`, `message`                           | Show the draft card. **Never send automatically.**                            |
| `set_motion`      | `level: still\|calm\|lively`                                     | Change the motion level                                                       |
| `search_record`   | `query`                                                          | **Server-side:** run retrieval again for follow-up or multi-part questions    |

Answers cite the retrieved chunks they used. The UI shows them as small source chips (for example "Projects · Ledgerline") that navigate to the source when clicked.

Contact rule: sending email happens **only** when the visitor presses Send on the draft card. The client then calls `POST /api/contact`. The model gets no tool that sends email.

If `GEMINI_API_KEY` is missing or the API fails, fall back to the local matcher ported from the prototype, so the site still works.

Conversation flows the prototype covers, which production must keep:

- Recruiter → short summary → Experience.
- Developer → Projects.
- "What stack?" → About.
- A project name → that project.
- A company name → that role.
- A skill → which projects use it.
- Contact → ask for email → validate → ask for message → show draft → Send / Edit / Cancel. "Cancel" works at any step.
- Unknown questions → a polite redirect to what Dusk can do.

---

## 7. Motion levels

These are visitor-selectable and remembered in `localStorage` under `dusk-motion`. **The default is Lively**; visitors with `prefers-reduced-motion: reduce` start on Still.

| Level  | Glyph change rate (share of cells per 45 ms) | Field brightness | Cursor light | Sphere spin |
| ------ | -------------------------------------------- | ---------------- | ------------ | ----------- |
| still  | 0                                            | .80              | .32          | .4×         |
| calm   | .020                                         | .95              | .45          | 1×          |
| lively | .045                                         | 1.10             | .58          | 1.7×        |

Still also turns off the heading flight, the shape bursts and the decoding effects. Reduced motion additionally disables CSS animations and smooth scrolling, and, while the level stays on Still, redraws canvases only on scroll or pointer events. A visitor who explicitly picks Calm or Lively gets continuous animation again: the explicit choice wins over the OS preference.

Pause the animation loop when `document.hidden`.

---

## 8. Sections

Every section has an eyebrow (`Section / detail` in mono, accent first word), marked `data-anchor` where the glyph streams land. Every section sits on a radial scrim, `ellipse 70% 62% at 30% 52%` from `rgba(bg,.8)` to transparent at 85%, so the glyph field stays visible at the edges while text stays readable. Text also gets a bg-coloured glow (`0 0 22px` and `0 0 3px`).

**No cards and no boxed buttons anywhere.** Actions are **text links**: mono 12px uppercase, a 1px underline at 35% opacity that goes full on hover, and an arrow that nudges 4px. Primary actions are accent-coloured.

1. **Intro (home)**
   - The glyph name FELISTAS fills the content area.
   - Bottom-left, over a soft radial scrim:
     - An availability line: a pulsing dot with "Available for senior roles · Software Engineer · Backend · Applied AI".
     - A serif sub-line with "calm" in accent italic.
     - Links: Ask Dusk anything (focuses the composer), Download resume, See the work.
     - A hint: "Run your cursor through the name…"
   - A vertical "SCROLL" cue sits bottom-right.
2. **About**
   - A large serif statement (`data-fly`).
   - Two columns:
     - Left: bio paragraphs, then a "Currently" line with a pulsing dot.
     - Right: a spec sheet (`dl` with mono labels and hairline rules: Focus, Experience, Works, Status).
   - Below: a single "Daily stack" line of skills separated by `/`. Hovering a skill flashes it in the glyph field.
3. **Projects**
   - Left: an index list of big serif project names (34–56px), each with a mono year and a status (Live / Building), separated by hairlines. The selected item indents 14px and gets an accent dot.
   - Right: a sticky detail panel showing kind · status, a huge serif metric with a mono caption, the description, "Built with …", and "Ask Dusk about <project>".
   - Hover, focus, click or the AI selects a project; hover also flashes the name in the glyph field.
4. **Experience**
   - A **year ruler** from 2020 to 2026 with ticks, and one lane per role. Each role is a translucent rose bar positioned by its start and end years.
   - The current role's bar has a glowing, pulsing right edge.
   - Hover, focus or click selects a role, and the selected bar fills with the accent colour.
   - Below: the role title (serif), `org · period · current`, an "Ask Dusk about this role" link, and achievements as a list with rotated-square accent bullets.
5. **Education**
   - Rows of huge outlined years (Big Shoulders 900, 1px rose stroke, which fills with accent on hover) next to the title (serif), the institution (mono, accent) and a note.
6. **Contact**
   - Heading "Let's build _something calm._" (`data-fly`).
   - **The letter:** an inline fill-in sentence set in serif 26–44px with underlined italic accent inputs: "Hi Felistas, I'm [name] from [company]. I'd like to talk about [topic]. You can reach me at [email]."
   - "Hand it to Dusk" validates the email (an inline error message if invalid) and opens the chat with the draft card ready to Send.
   - Then a row with the email (copy action), GitHub and LinkedIn, and a footer line.

---

## 9. Screen sizes

| Width                                | Layout                                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 900px and up                         | The full layout: companion column `clamp(340px, 30vw, 440px)`, two-column section details                                                                                 |
| 600–899px (tablets, unfolded phones) | The full layout with a narrower column, `clamp(230px, 34vw, 340px)`; section details stack to one column; the section nav shows from 800px, the "Motion" label from 900px |
| Below 600px (phones)                 | The column becomes a bottom sheet (below)                                                                                                                                 |

### 9.1 Phones (below 600px)

- The column becomes a **bottom sheet**: 156px collapsed, 76% expanded, with a .4s ease.
  - The collapsed sheet shows the 40px sphere slot, "Dusk" with its status, an expand button, a one-line preview of the last AI message, and the composer.
  - The log and chips appear only when the sheet is expanded.
  - Asking anything or tapping an "Ask…" link expands the sheet. AI navigation collapses it.
- The nav and the "Motion" label are hidden; the motion buttons stay.
- Content panels get 200px of bottom padding, and every two-column layout stacks to one column.
- The glyph streams are not drawn on mobile.

---

## 10. Accessibility and quality bar

- A real `h1` ("Felistas, Software Engineer") exists for screen readers. The canvas name is decorative (`aria-hidden`).
- The chat log is `aria-live="polite"`. Every control has an accessible name and a visible focus ring (1.5px accent, 3px offset).
- All interactive selections (projects, roles) work with hover, focus and click.
- The colour contrast of text on scrim meets WCAG AA. Never put body text directly on bright glyphs.
- Performance targets:
  - The glyph field runs at about 30 fps, and the canvases are capped at 2× device pixel ratio.
  - Use one `requestAnimationFrame` loop for the whole stage, with no React re-renders per frame (use refs).
  - Pause when the tab is hidden.
  - Use fewer sphere points on small screens.

---

## 11. What the prototype cannot show (production requirements)

- Real Gemini answers with the tool calls in §6.1, streamed to the client.
- A real resume download (a static PDF in `public/resume/`).
- Real email delivery through Resend, from `POST /api/contact`, validated with zod. Include a honeypot field and basic per-IP rate limiting.
- Real content in `content/`: one source used by the UI, the retrieval index and the fallback matcher.
- SEO metadata, an Open Graph image, and a favicon in the Dusk palette.

## 12. Acceptance checklist

- [ ] The intro shows a large rotating glyph sphere on the left and FELISTAS formed in glyphs on the right; the glyphs part around the cursor and the sphere watches it.
- [ ] Scrolling glides the sphere to the top of the column while it stays large; the conversation rises and gets taller; there is no panel or divider.
- [ ] Each section change makes the sphere burst and re-form into that section's shape, and the `form ·` label updates.
- [ ] Each section heading flies out of the sphere, letter by letter, into place. Still mode shows it instantly.
- [ ] Glyph streams, shaped by the sphere's form, feed the current section's eyebrow.
- [ ] Projects: an index list with a live detail panel and glyph flash. Experience: a year ruler. Education: outlined years. Contact: the fill-in letter.
- [ ] There are no cards and no boxed buttons.
- [ ] The motion switch works, defaults to Lively and is remembered.
- [ ] The chat shows tool lines, the resume card and the draft card; sending email always needs a click on Send.
- [ ] The mobile bottom sheet works, and the page never scrolls horizontally.
