---
sample: true
groups:
  - name: Languages
    items: [Go, TypeScript, Python, Rust, SQL]
  - name: Systems
    items: [PostgreSQL, Kafka, Redis, gRPC, Kubernetes]
  - name: AI
    items: [Gemini API, RAG, pgvector, Evals]
  - name: Frontend
    items: [React, Next.js, Astro]
---

Go is the default for services that sit on a hot path, like the Ledgerline reconciliation engine. TypeScript covers the web layer and internal dashboards such as Pulse. Python is used for data work and the retrieval pipeline behind Atlas.

PostgreSQL is the system of record almost everywhere, with Kafka carrying events between services and Redis used for short-lived state and rate limits.

The AI work is grounded and measured: retrieval with pgvector, answers from the Gemini API, and evaluation sets that run before anything ships.
