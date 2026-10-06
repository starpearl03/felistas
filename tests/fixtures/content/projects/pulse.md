---
sample: true
name: Pulse
kind: Observability UI
status: LIVE
year: "2024"
order: 4
stack: [TypeScript, React, WebSockets]
desc: Live dashboard that streams service health and lets on-call engineers replay the last hour of any incident.
metric: <120ms
metricLabel: p95 render time
---

## Problem

During incidents, on-call engineers switched between several monitoring tools and lost the timeline of what changed when.

## Approach

Pulse streams service health over WebSockets into a single React view. It keeps a rolling hour of events in memory, so an engineer can scrub back through an incident and see metrics, deploys and alerts on one timeline. Rendering is virtualised to stay fast with hundreds of services.

## Result

The p95 render time stays under 120 ms, and incident reviews now start from a shared replay instead of screenshots.
