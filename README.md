# Felistas · portfolio

[![CI](https://github.com/starpearl03/felistas/actions/workflows/ci.yml/badge.svg)](https://github.com/starpearl03/felistas/actions/workflows/ci.yml)

The portfolio site of Felistas, a software engineer. The whole page is a calm, dark field of living glyphs, with an AI companion called **Dusk**, a rotating sphere made of glyphs. Visitors can ask Dusk about Felistas, jump to any section, download the resume, or leave a message.

> Status: project setup. The approved design is a working prototype in [`docs/ui`](docs/ui), and the app UI is not built yet.

## Design

| File                                                         | What it is                                                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`docs/ui/UI-SPEC.md`](docs/ui/UI-SPEC.md)                   | The full UI/UX specification: tokens, layout, animation maths, the chat and AI tools, each section, mobile, accessibility, and an acceptance checklist |
| [`docs/ui/Felistas Dusk.html`](<docs/ui/Felistas Dusk.html>) | The approved prototype. Open it in a browser to see and use the exact design. It is the source of truth for exact values                               |
| `docs/ui/Felistas Dusk.md`                                   | An automatic text export of the prototype. Not useful on its own                                                                                       |

## Stack

| Concern         | Choice                                                                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict)                                                                                                       |
| Styling         | Tailwind CSS v4, with the Dusk design tokens in `src/app/globals.css`                                                                                                   |
| Fonts           | `next/font/google`: Instrument Serif, Geist, Geist Mono, Big Shoulders                                                                                                  |
| Animation       | Hand-written Canvas 2D (glyph field, glyph sphere, flying headings) driven by one `requestAnimationFrame` loop; no WebGL or animation libraries                         |
| AI              | Vercel AI SDK 7 (`ai`, `@ai-sdk/react`, `@ai-sdk/google`) on the free Gemini tier: streaming chat with tools that drive the page, server-side only (`POST /api/chat`)   |
| Retrieval (RAG) | Hybrid BM25 + `gemini-embedding-001` with reciprocal rank fusion over a JSON index built from `content/` at build time (no vector database); answers cite their sources |
| Email           | Resend (`POST /api/contact`), input validated with zod                                                                                                                  |
| Content         | Markdown + YAML frontmatter in `content/`, validated with zod; one source for the pages, the RAG index and the offline agent                                            |
| Hosting         | Vercel                                                                                                                                                                  |

## Getting started

Requires Node.js 22 or newer (developed on Node 24).

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev                  # http://localhost:3000
```

The site works without keys. Without `GEMINI_API_KEY`, Dusk falls back to a local keyword matcher, and without Resend keys the contact form reports that sending is unavailable. With a key, Dusk also answers offline whenever Gemini fails or rate-limits (it then rests for a minute), and once the site's own budget of 8 answers a minute or 200 a day is spent, so the free tier is never exceeded.

### Environment variables

| Variable               | Required       | Purpose                                                                                          |
| ---------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| `GEMINI_API_KEY`       | For live AI    | Gemini key from [Google AI Studio](https://aistudio.google.com/apikey) (the free tier is enough) |
| `GEMINI_MODEL`         | No             | Model id, default `gemini-flash-lite-latest`                                                     |
| `RESEND_API_KEY`       | For email      | Resend API key                                                                                   |
| `CONTACT_TO_EMAIL`     | For email      | Inbox that receives visitor messages                                                             |
| `CONTACT_FROM_EMAIL`   | For email      | Verified sender, for example `Dusk <dusk@felistas.dev>`                                          |
| `NEXT_PUBLIC_SITE_URL` | For production | Canonical URL for metadata and Open Graph                                                        |

### Scripts

| Command                       | Does                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`                 | Start the dev server                                                                |
| `npm run build` / `npm start` | Production build and serve                                                          |
| `npm run lint`                | ESLint                                                                              |
| `npm run typecheck`           | TypeScript, no emit                                                                 |
| `npm run format`              | Format with Prettier (`format:check` only checks)                                   |
| `npm run test`                | Unit tests (Vitest)                                                                 |
| `npm run test:e2e`            | End-to-end tests (Playwright, desktop and mobile Chromium)                          |
| `npm run rag:index`           | Build Dusk's retrieval index from `content/` (runs before every build)              |
| `npm run rag:eval`            | Retrieval quality on `tests/rag/golden.json` (recall@6, MRR)                        |
| `npm run verify`              | Lint, typecheck, format check, unit tests, retrieval gate and build: the merge gate |

First-time e2e setup: `npx playwright install chromium`.

### Contributing

`main` is protected on GitHub: it only changes through pull requests, and the `verify + e2e` check must pass on an up-to-date branch. CI (`.github/workflows/ci.yml`) must be green before merging, and PRs are squash-merged. `npm install` activates a pre-push hook (`.githooks/pre-push`) that refuses direct pushes to `main`, and the `main-guard` workflow flags any commit on `main` that did not come from a merged PR.

## Project structure

Today:

```
content/               all site content: Markdown + YAML frontmatter (currently sample: true)
docs/ui/               approved design: prototype + UI-SPEC.md
public/resume/         felistas-resume.pdf (add the real file)
src/app/               routes, root layout, global tokens
src/features/content/  zod schemas, markdown helpers, server-only loader (loadSite)
src/lib/               validated env
tests/                 unit (Vitest) and e2e (Playwright)
```

### Editing content

Everything the site and Dusk say about Felistas comes from `content/`:

| File                  | Holds                                                                       |
| --------------------- | --------------------------------------------------------------------------- |
| `profile.md`          | name, role, line, availability, facts, links, resume; the body is the bio   |
| `skills.md`           | skill groups; the body explains how they are used                           |
| `projects/<id>.md`    | one project per file (the file name is its id); the body is the case study  |
| `experience/<org>.md` | one role per file with start/end years for the ruler; exactly one `current` |
| `education/<slug>.md` | degrees and certifications                                                  |
| `faq.md`              | `## Question` headings with answers                                         |

The build validates every file and fails with the file name and field if something is wrong. Remove `sample: true` from each file as real content replaces the placeholders.

Dusk searches the same files. `npm run rag:index` splits them into passages and indexes them: BM25 always, plus Gemini embeddings when `GEMINI_API_KEY` is set (cached in `.cache/`, so a rebuild only embeds changed text). After changing content, add or update questions in `tests/rag/golden.json` and check `npm run rag:eval`; the merge gate requires BM25 recall@6 of at least 0.9.

Target:

```
content/                  Markdown + frontmatter: profile, skills, projects, experience, education, faq
scripts/                  build-rag-index.ts, rag-eval.ts
src/app/                  layout, page, metadata routes, api/chat, api/contact
src/features/content/     zod schemas + server-only loader
src/features/stage/       animation engine (glyph field, sphere, flights, thread), store, command bus
src/features/sections/    Intro, About, Projects, Experience, Education, Contact
src/features/companion/   Dusk chat UI: messages, tool lines, resume/draft cards, source chips
src/features/agent/       tools, system prompt, hybrid retrieval, offline agent, rate limit
src/features/contact/     contact schema + Resend sender
src/components/ui/        shared primitives (TextLink, CopyButton, Toast)
src/generated/            rag-index.json (built, gitignored)
tests/                    unit, e2e (Playwright), rag golden set
```

## Before launch

- [ ] Replace the sample content in `content/` with real details.
- [ ] Add `public/resume/felistas-resume.pdf`.
- [ ] Set the environment variables on Vercel and verify the Resend sending domain.
- [ ] Go through the acceptance checklist in `docs/ui/UI-SPEC.md` §12.
