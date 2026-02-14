Agent Architecture: Promptr MVP
Overview
Promptr uses a Conductor-Specialist pattern with sequential prompt chaining (research-backed for MVP reliability). Four specialist agents coordinate through a central Orchestrator, following the research's "Plan First, Code Second" methodology.
Core Pattern: Prompt Chaining (sequential, predictable, debuggable)
 Secondary Pattern: Generator-Critic (automatic quality assurance)
 Communication Format: Markdown (34-38% token savings vs JSON per research)

Agent Roster
1. Orchestrator (Conductor)
Model: None (pure logic, no LLM)
 Role: Central workflow coordinator
Responsibilities:
Manages project state transitions (eliciting → planning → synthesizing → critiquing → completed)
Routes user input to appropriate specialist agents
Emits WebSocket progress events
Handles errors and retries
Enforces workflow rules (spec.md approval gate)
Does NOT:
Call LLMs directly
Make content decisions
Generate any text

2. Requirements Elicitor (PM Persona)
Model: Claude 3.5 Haiku
 Role: Extract key details from vague ideas
Responsibilities:
Analyze initial idea for vagueness/completeness
Generate 1-3 targeted questions using 5W1H framework
Who: Target audience
What: Core features
Where: Platform (mobile/web/both)
Why: Problem being solved
How: Visual aesthetic/vibe
Keep questions simple, non-technical
Avoid overwhelming user
Input: User's initial idea (text)
 Output: 1-3 questions in Markdown format
 Triggers Next: User answers → Architect agent
Quality Rules:
Maximum 3 questions per session
Questions must be answerable in 1-2 sentences
Use multiple choice when possible
If idea is clear, ask fewer questions (1-2)

3. Technical Architect (Architect Persona)
Model: Claude Sonnet 4
 Role: Generate spec.md (app plan, not code)
Responsibilities:
Synthesize user's idea + answers into structured spec.md
Recommend appropriate tech stack (with brief justification)
Define core features as user stories
Outline data model at HIGH level (e.g., "users can save workouts")
Describe UI/UX aesthetic direction
Keep technical jargon minimal - assume non-technical audience
Input: Initial idea + user's answers to questions
 Output: spec.md in Markdown
spec.md Structure:
# Project: [Generated Title]

## What You're Building
[1-2 sentence summary]

## Who It's For
[Target audience]

## Core Features
- Feature 1 (as user story: "As a user, I can...")
- Feature 2
- Feature 3

## How It Will Look & Feel
[Visual aesthetic, vibe, design direction]

## Recommended Tech Stack
- Frontend: [Choice] - [1 sentence why]
- Backend: [Choice] - [1 sentence why]
- Database: [Choice] - [1 sentence why]

## How Your Data Works
[High-level: what gets saved, relationships]

## Build Stages
1. [Stage 1 name and what it includes]
2. [Stage 2 name and what it includes]
...

Triggers Next: User approves spec.md → Synthesizer agent
Critical Rule: Orchestrator MUST wait for user approval before proceeding. User can request changes.

4. Prompt Synthesizer (Writer Persona)
Model: Claude Sonnet 4
 Role: Transform spec.md into sequential prompts for Claude Code
Responsibilities:
Generate 5-6 specialized prompts based on spec.md
Each prompt follows high-fidelity structure from research:
Persona & Identity
Context & World-Building
Precise Objectives
Technical Constraints
Aesthetic Guidance (the "vibe")
Use XML-style tags or Markdown headers for structure
Include completion checklists for each prompt
Ensure prompts are comprehensive (not vague)
Input: Approved spec.md
 Output: Array of prompts in execution order
Prompt Sequence (Standard):
Project Setup - Initialize repo, dependencies, folder structure
Data Models & Backend - Database schema, API endpoints
Frontend/UI - Components, pages, styling with aesthetic focus
Integration - Connect frontend to backend, error handling
Deployment - Environment setup, hosting instructions
Each Prompt Contains:
Title (e.g., "Prompt 1: Project Foundation")
Persona assignment (e.g., "You are a Senior Full-Stack Engineer...")
Full context (why this project exists, what was built so far)
Specific objectives with success criteria
Tech stack constraints
Aesthetic/vibe guidance (for UI prompts)
Completion checklist
Triggers Next: Prompts generated → Critic agent (automatic)

5. Critic (Quality Assurance Persona)
Model: GPT-4o-mini (different model to prevent bias, per research)
 Role: Audit prompts for quality, completeness, consistency
Responsibilities:
Check for underspecified constraints
Identify missing edge cases
Detect conflicting instructions across prompts
Flag vague/lazy outputs from Synthesizer
Ensure aesthetic guidance is present for UI prompts
Verify prompts follow high-fidelity structure
Input: Generated prompts + original spec.md
 Output:
issues_found: boolean
feedback: Array of specific issues
severity: "minor" | "major" | "critical"
Auto-Refinement Logic:
If issues_found AND severity is "major" or "critical":
Send feedback back to Synthesizer
Synthesizer refines prompts automatically
Critic re-evaluates (max 1 retry to avoid loops)
If severity is "minor":
Log issues but proceed (user can refine later)
Quality Checks:
[ ] Each prompt has clear persona
[ ] Tech stack is consistent across prompts
[ ] UI prompts include aesthetic/vibe details
[ ] Edge cases addressed (offline mode, errors, loading states)
[ ] No contradictory instructions
[ ] Prompts are sufficiently detailed (not lazy/short)
Triggers Next: Issues resolved → Mark project complete, notify user

Workflow Execution
Full Workflow (Happy Path)
User submits idea
    ↓
Orchestrator creates project (status: "eliciting")
    ↓
Elicitor analyzes idea → generates 1-3 questions
    ↓
[WAIT] User answers questions
    ↓
Architect generates spec.md
    ↓
Orchestrator shows spec.md to user
    ↓
[WAIT] User approves spec.md (or requests changes)
    ↓
Synthesizer generates 5-6 prompts
    ↓
Critic audits prompts (automatic)
    ↓
IF issues found (major/critical):
    Synthesizer refines → Critic re-audits
    ↓
Project marked complete, user receives prompts

User Refinement Flow
User: "Make the UI more playful"
    ↓
Orchestrator identifies target: UI prompt (Prompt 3)
    ↓
Synthesizer refines ONLY Prompt 3
    ↓
Critic audits refined prompt
    ↓
Updated prompt saved, user notified


Agent Communication Format
Markdown Structure (Token Efficient)
All agents communicate using Markdown. Example:
Elicitor Output:
## Question 1: Platform
What type of app are you building?
- Mobile app (iOS/Android)
- Web app (browser-based)
- Both mobile and web

## Question 2: Visual Style
How should the app look and feel?
- Modern & sleek (clean lines, minimalist)
- Fun & playful (bright colors, animations)
- Professional & corporate (subtle, trustworthy)

## Question 3: Key Feature
What's the main thing users will do?
[Open text response]

Architect Output:
# Project: FitTrack Pro

## What You're Building
A mobile fitness tracking app that helps users log workouts and visualize progress over time.

## Who It's For
Casual fitness enthusiasts who want simple, visual progress tracking without complexity.

[... rest of spec.md ...]


State Management
Project Status States
Status
Description
Active Agent
eliciting
Generating questions
Elicitor
awaiting_answers
Waiting for user input
None (paused)
planning
Generating spec.md
Architect
awaiting_approval
Waiting for spec approval
None (paused)
synthesizing
Generating prompts
Synthesizer
critiquing
Auditing quality
Critic
refining
Auto-fixing issues
Synthesizer
completed
Prompts ready
None
failed
Error occurred
None

Workflow Data (JSONB)
Stored in projects.workflow_data:
{
  "questions": [...],
  "user_answers": [...],
  "spec_md": "...",
  "spec_approved": true,
  "raw_prompts": [...],
  "critique_results": {...},
  "refinement_history": [...]
}


Error Handling & Retries
Agent Failure Scenarios
LLM API Timeout/Error:
Retry 3x with exponential backoff
If all retries fail, mark project as "failed"
Emit error event to user via WebSocket
Lazy Agent Output (too short/vague):
Critic detects (output < 200 words for prompts)
Automatically triggers refinement
Max 1 retry to avoid infinite loops
User Disconnects Mid-Workflow:
Workflow continues in background (Celery)
State persists in database
User reconnects, sees current status
Spec.md Approval Timeout:
If user doesn't approve within 24 hours, send reminder
Project remains in "awaiting_approval" indefinitely
No automatic progression

Agent System Prompts (File Locations)
Each agent has a dedicated system prompt stored as Markdown:
/backend/app/agents/prompts/
  - elicitor_prompt.md       # Requirements Elicitor instructions
  - architect_prompt.md      # Technical Architect instructions
  - synthesizer_prompt.md    # Prompt Synthesizer instructions
  - critic_prompt.md         # Critic/QA instructions

Key Prompt Engineering Principles (from research):
Assign clear persona (e.g., "You are a Senior Product Manager...")
Provide context about Promptr's purpose
Define output format explicitly
Include examples of good/bad outputs
Use XML tags for structured sections
Emphasize user-centric, non-technical language (for Elicitor/Architect)

Handoff Logic
When Does Orchestrator Route to Each Agent?
Elicitor:
Project status = "eliciting"
Trigger: New project created
Architect:
Project status = "planning"
Trigger: User submitted answers to questions
Synthesizer:
Project status = "synthesizing"
Trigger: User approved spec.md
Critic:
Project status = "critiquing"
Trigger: Synthesizer finished generating prompts (automatic)
Refinement:
User submits refinement request
Synthesizer targets specific prompt section
Critic re-audits

Parallelism Strategy (Minimal)
No Parallelism in MVP:
All agents run sequentially (prompt chaining)
Predictable, debuggable, simple state management
Research emphasizes avoiding "parallel confusion"
Post-MVP Consideration:
Could parallelize independent Critic checks (security, style, completeness)
Only if latency becomes an issue (> 30 seconds per workflow)

Cost Optimization
Model Selection Rationale:
Agent
Model
Why
Cost/Call
Elicitor
Haiku
Short outputs, simple task
~$0.02
Architect
Sonnet
Quality critical, complex reasoning
~$0.15
Synthesizer
Sonnet
Quality critical, long outputs
~$0.15
Critic
GPT-4o-mini
Different model (bias prevention), cheap
~$0.03

Total per project: ~$0.35-0.50
Token Savings:
Markdown format saves 34-38% vs JSON (research-backed)
Reuse spec.md context instead of re-explaining

Implementation Checklist
For Claude Code to Build:
Orchestrator:
[ ] State machine for workflow transitions
[ ] WebSocket event emission at each stage
[ ] User approval gate before synthesizing prompts
[ ] Error handling and retry logic
Elicitor Agent:
[ ] Analyze idea vagueness
[ ] Generate 1-3 questions (never more)
[ ] Parse Markdown output into structured questions
Architect Agent:
[ ] Generate spec.md with ALL required sections
[ ] Recommend tech stack with brief justifications
[ ] Keep language non-technical
[ ] Save spec to projects.spec_md
Synthesizer Agent:
[ ] Generate 5-6 sequential prompts
[ ] Each prompt has persona, context, objectives, constraints, aesthetic
[ ] Include completion checklists
[ ] Handle targeted refinements (update one prompt only)
Critic Agent:
[ ] Audit for underspecified constraints
[ ] Check for conflicting instructions
[ ] Flag lazy/short outputs
[ ] Provide structured feedback
[ ] Trigger auto-refinement if needed

Next Document
03-agent-system-prompts.md will contain:
Complete system prompt for each agent
Examples of expected inputs/outputs
Edge case handling instructions