---
name: SENTRY
kind: Phishing email detection
status: WIP
year: "2026"
order: 1
stack: [Python, FastAPI, Next.js, TypeScript]
desc: A phishing detection system for Gmail. A browser extension gets a verdict in under a second, and analysts review flagged email on a live dashboard.
metric: "4"
metricLabel: stages, with a sub-second first verdict
url: https://github.com/starpearl03/sentry-api
---

## Problem

Phishing email lands in ordinary inboxes, and a verdict is only useful if it arrives before someone clicks. The people who triage suspicious mail also need one place to see what was flagged, why, and what changed.

## Approach

A FastAPI service runs a four-stage pipeline. Only the first stage, an LLM classifier, sits on the request path, so the Gmail extension gets a verdict in under a second. The rest runs in the background: links are unshortened and scraped, linked pages are analysed with Gemini, and the results are combined under explicit override rules. A confident first verdict skips the expensive stages entirely.

The API is a modular monolith with two separate auth surfaces: JWTs for dashboard users and hashed install tokens for extension installs, each with its own revocation path.

## The dashboard

A Next.js 16 and React 19 dashboard gives analysts live stats, a filterable history, per-email detail with a breakdown of every link, manual review and overrides, and admin tools to manage users and block extension installs.
