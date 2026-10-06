---
sample: true
name: Ledgerline
kind: Payments infrastructure
status: LIVE
year: "2025"
order: 1
stack: [Go, PostgreSQL, Kafka]
desc: Real-time reconciliation engine that matches transactions across three banks and flags drift within 90 seconds.
metric: 2M+
metricLabel: transactions a day
---

## Problem

Settlement used to be reconciled in a nightly batch. Mismatches between the ledger and the banks surfaced a day late, and finance spent mornings chasing them by hand.

## Approach

Ledgerline consumes bank statement events and internal ledger events from Kafka and matches them in a streaming join keyed by reference and amount. Unmatched items age into a drift queue that alerts after 90 seconds. The service is written in Go and keeps its state in PostgreSQL with idempotent writes, so replays are safe.

## Result

It matches more than two million transactions a day across three banks. Drift is now visible within minutes instead of the next morning, and the nightly batch was retired.
