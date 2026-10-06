---
name: Staff Portal
kind: Internal web platform
status: LIVE
year: "2025"
order: 3
stack: [Next.js, TypeScript, MongoDB, FastAPI]
desc: An internal staff portal for Glow Petroleum, owned end to end, with role-based access so each team sees only its own data.
metric: RBAC
metricLabel: each team sees only its own data
---

## Problem

Glow Petroleum's departments needed one internal portal for their staff, with each team able to see its own information and nothing else.

## Approach

Felistas gathered requirements from the department heads, designed the data model in MongoDB, and built the portal in Next.js and TypeScript with role-based access control. The front end deploys to Vercel with a preview build for every pull request. A Python FastAPI REST API runs on Render, deploying automatically from GitHub with environment-based configuration.

## Result

The portal shipped to staff, and Felistas owned it end to end, from the first requirements meeting to production.
