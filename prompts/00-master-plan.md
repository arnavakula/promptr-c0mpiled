# Project Overview: Promptr

## 1. The Problem
Prompting tools like Claude Code to "vibecode" apps can be unintuitive, especially for nontechnical audiences. Improper prompts can lead to hallucinations, over/under-engineering, etc. You need to write thorough, structured prompts for LLM tools to effectively build what you want, which vibecoders may not be familiar with.

## 2. What Promptr does
Promptr is a prompt refinement tool that can take vague ideas for apps and transform them into thorough prompts for AI tools to build out.

Promptr will take a user's idea for an app, ask the user questions to get more context on *what* they want to build and *how* they want to build it (without overwhelming the user), plan out different stages of building the app, and write targeted prompts for these stages. Promptr will use an agentic workflow that takes after the planner-generator-evaluator model.

## 3. What Promptr DOESN'T do
Promptr does not write code for users, it only writes and optimizes *prompts*. 

## 4. Core user flow
- User enters their idea or selects a starter template(e.g. "I want to build an app for managing my fitness goals")
- Promptr will ask them up to 3 targeted questions for more context on what they want to build, covering platform, audience, tech preferences, and aesthetic vibe (e.g. "Is this a mobile app or a website? Who is this for?")
- User answers questions
- Promptr generates a reviewable project plan (spec.md) covering features, tech stack, UI direction, and data model
- User approves plan or requests changes
- Promptr will determine the different aspects of the app (e.g. UI, database, UX, architecture, deployment, etc.)
- Promptr writes specialized prompts for each build stage
- Promptr's evaluator audits for missing constraints, edge cases, hallucinations, and conflict
- The user can give feedback to Promptr (e.g. "For the UI make sure to emphasize a sleek, modern design")
- Promptr iterates on specific sections without regenerating entire plan and gives the final prompt package
.,

