---
sample: true
name: Atlas
kind: Semantic search
status: LIVE
year: "2025"
order: 2
stack: [Python, pgvector, Gemini]
desc: Search over internal documents with retrieval, reranking and cited answers. Support lookups went from minutes to seconds.
metric: 40k
metricLabel: documents indexed
---

## Problem

Support engineers searched a wiki, a ticket archive and several runbook folders to answer one question. Keyword search missed paraphrases and returned long pages with no pointer to the useful paragraph.

## Approach

Atlas chunks every document by heading, embeds the chunks into pgvector and combines vector search with keyword search. A reranker orders the results, and the Gemini API writes a short answer that cites the chunks it used. An evaluation set of real support questions runs on every change to the pipeline.

## Result

About forty thousand documents are indexed. Typical lookups dropped from several minutes to a few seconds, and every answer links back to its sources.
