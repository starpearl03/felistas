---
sample: true
name: Quorum
kind: Distributed config store
status: WIP
year: "2026"
order: 3
stack: [Rust, Raft, gRPC]
desc: A small Raft-backed key-value store for feature flags, built to learn consensus properly and to survive chaos tests.
metric: "5"
metricLabel: node chaos suite
---

## Why

Quorum is a learning project with a practical target: a feature-flag store that keeps working when nodes crash or the network splits.

## Approach

It implements Raft leader election and log replication in Rust, with gRPC between nodes. A chaos suite starts five nodes, kills and partitions them at random, and checks that committed writes are never lost and reads stay linearizable.

## Status

Leader election and replication pass the chaos suite. Snapshotting and membership changes are in progress.
