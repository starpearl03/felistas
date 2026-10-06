---
name: Sentinel
kind: Crime analysis and face recognition
status: DONE
year: "2026"
order: 2
stack: [Python, Flask, OpenCV, InsightFace]
desc: Final-year AI project that matches faces from CCTV footage against a watch list, sends community safety alerts and maps crime patterns over time.
metric: AI
metricLabel: final-year project, University of Zimbabwe
url: https://github.com/starpearl03/sentinel
---

## Why

Sentinel is Felistas's final-year project for the BSc in Computer Science at the University of Zimbabwe: an intelligence system that helps identify suspects and missing people, and shows where crime concentrates.

## Approach

Face detection and matching run on images and video with OpenCV and InsightFace, against a watch list of records. Crime reports are clustered geographically with DBSCAN to find hotspots, and Gemini writes short analysis summaries. Alerts go out by email and SMS.

The system is built in Python with Flask and SQLAlchemy, in four modules that share one clean-architecture pattern, with role-based access control and soft deletes so records can be recovered.

## Result

A working end-to-end system covering criminal records, missing persons, face matching, hotspot maps and alerts, delivered as the final-year AI project.
