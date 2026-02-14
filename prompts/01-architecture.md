Full-Stack Architecture: Promptr MVP
Tech Stack
Frontend: Next.js 14 + TypeScript + Tailwind + shadcn/ui + Socket.IO
 Backend: FastAPI (Python 3.11) + Socket.IO + Celery
 Database: PostgreSQL 15 + Redis 7
 Agents: OpenAI Swarm pattern (custom)
 Models: Claude 3.5 Haiku (elicitor) + Claude Sonnet 4 (architect/synthesizer) + GPT-4o-mini (critic)
 Deploy: Railway/Render + Vercel

System Architecture
Client (Next.js) 
  ↓ HTTPS + WebSocket
FastAPI Backend
  ↓
├─ REST API (auth, projects, prompts)
├─ WebSocket (real-time progress)
├─ Orchestrator (workflow coordination)
└─ Celery Workers (background agent tasks)
  ↓
├─ PostgreSQL (users, projects, prompts, events)
└─ Redis (job queue, cache, rate limits)

Key Flow:
User submits idea → Backend creates project, queues Celery task
Celery executes agent workflow in background
Agents emit progress via WebSocket
User answers questions via REST API
Workflow continues until prompts generated
Final prompts saved to DB, user notified

Database Schema
Users
id, email, password_hash, full_name
projects_created, max_projects (default 3)
is_active, created_at, updated_at

Projects
id, user_id, title, initial_idea
status ('eliciting', 'planning', 'synthesizing', 'critiquing', 'completed', 'failed')
current_stage, workflow_data (JSONB)
spec_md (TEXT), final_prompts (JSONB)
refinement_count, max_refinements (default 3)
created_at, updated_at, completed_at

Conversation Events
id, project_id
event_type ('user_input', 'agent_question', 'agent_response', 'system_update')
agent_role, content, metadata (JSONB)
sequence_number, created_at

Prompts
id, project_id
stage ('setup', 'backend', 'frontend', 'integration', 'deployment')
title, content (TEXT), checklist (JSONB)
sequence_order, version, created_at

User Sessions (cost tracking)
id, user_id, project_id
session_start, session_end, duration_seconds
total_tokens_used, estimated_cost_usd


API Endpoints
Auth
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

Projects
GET    /api/projects                        # List user's projects
POST   /api/projects                        # Create new (queues workflow)
GET    /api/projects/{id}                   # Get project details
PATCH  /api/projects/{id}/respond           # Submit answers to questions
POST   /api/projects/{id}/refine            # Request targeted refinement
GET    /api/projects/{id}/conversation      # Get conversation history
GET    /api/projects/{id}/prompts           # Get final prompts
POST   /api/projects/{id}/export            # Download prompt package
DELETE /api/projects/{id}                   # Delete project

Users
GET /api/users/me/stats                     # Projects used, remaining, cost


Backend Structure
/backend/app
  /main.py                    # FastAPI app
  /config.py                  # Settings
  /database.py                # SQLAlchemy setup
  
  /api/routes                 # REST endpoints
  /models                     # SQLAlchemy models
  /schemas                    # Pydantic schemas
  /services                   # Business logic
  
  /agents
    /orchestrator.py          # Workflow coordinator
    /elicitor.py              # Requirements agent (Haiku)
    /architect.py             # Spec.md generator (Sonnet)
    /synthesizer.py           # Prompt writer (Sonnet)
    /critic.py                # Evaluator (GPT-4o-mini)
    /base_agent.py            # Abstract base class
    /prompts/*.md             # Agent system prompts
  
  /tasks
    /celery_app.py            # Celery config
    /workflow_tasks.py        # Background jobs
  
  /websocket
    /socket_manager.py        # Socket.IO handlers
  
  /utils
    /llm_client.py            # LLM API wrapper
    /cost_calculator.py       # Token cost tracking


Frontend Structure
/src
  /app
    /(auth)/login, /register
    /(dashboard)
      /dashboard              # Project list
      /projects/[id]          # Workflow UI
      /projects/[id]/prompts  # Final output
  
  /components
    /ui                       # shadcn components
    /project
      /WorkflowStepper.tsx
      /QuestionForm.tsx
      /PromptCard.tsx
      /SpecPreview.tsx
  
  /lib
    /api-client.ts            # Axios with auth
    /socket.ts                # Socket.IO client
    /auth.ts                  # Auth context
  
  /hooks
    /useProject.ts            # SWR project data
    /useSocket.ts             # Socket connection


Agent Workflow
Orchestrator
Purpose: Coordinates workflow stages and manages state
 Responsibilities:
Routes to appropriate specialist agents
Manages project status transitions
Emits progress events via WebSocket
Handles errors and retries
Requirements Elicitor (Haiku)
Purpose: Ask 3 targeted questions to clarify vague ideas
 Input: User's initial idea
 Output: Structured questions (platform, audience, tech preferences, vibe)
 Communication: Emits questions via WebSocket, waits for API response
Technical Architect (Sonnet)
Purpose: Generate spec.md with tech stack and architecture
 Input: User's answers to questions
 Output: Markdown spec.md (features, tech stack, data model, UI direction)
 Saves to: projects.spec_md field
Prompt Synthesizer (Sonnet)
Purpose: Generate 5-6 sequential prompts for Claude Code
 Input: spec.md
 Output: Array of prompts (setup, backend, frontend, integration, deployment)
 Format: Each prompt has title, content, checklist
Critic (GPT-4o-mini)
Purpose: Audit prompts for missing constraints, edge cases, conflicts
 Input: Generated prompts + spec.md
 Output: Feedback + issues found
 Action: If issues found, synthesizer refines automatically

Real-Time Communication
WebSocket Events (Socket.IO)
Client → Server:
join_project: {project_id}

Server → Client:
progress_update: {stage, message, timestamp}
questions_ready: {questions}
spec_ready: {spec}
prompts_generated: {count}
workflow_completed: {status}
workflow_failed: {error}
refinement_completed: {section}

Frontend displays high-level progress:
"Asking clarifying questions..."
"Planning your app's architecture..."
"Writing optimized prompts..."
"Evaluating prompt quality..."

Background Jobs (Celery)
Tasks
workflow.start_project(project_id)
Executes full workflow: elicit → architect → synthesize → critique
Runs in background (continues if user disconnects)
Updates project status at each stage
Emits WebSocket events
workflow.process_user_response(project_id, answers)
Stores user answers
Continues workflow from elicitation to completion
workflow.refine_prompts(project_id, refinement_request, target_section)
Targeted refinement (only updates specific section)
Checks refinement limit (max 3)
Emits completion event

Authentication
JWT tokens (24hr expiration)
HTTPBearer security scheme
Password hashing with bcrypt
Protected routes use get_current_user dependency

Rate Limiting & Cost Control
Hard Caps
Limit
Value
Where Enforced
Max Users
80
Registration endpoint
Projects per User
3
Project creation
Refinements per Project
3
Refinement endpoint
Questions per Session
3
Elicitor agent
Max Workflow Duration
10 min
Celery timeout

Model Selection by Task
Elicitor: Haiku (~$0.02/call) - Fast, cheap questions
Architect: Sonnet (~$0.15/call) - Quality critical
Synthesizer: Sonnet (~$0.15/call) - Quality critical
Critic: GPT-4o-mini (~$0.03/call) - Different model prevents bias
Est. cost per project: $0.35-0.50

MVP Feature Scope
Included ✅
User auth & accounts
Save all project data (prompts + conversation)
Real-time progress (minimal updates)
Sequential prompt generation (5-6 stages)
spec.md preview
Targeted refinements
Cost tracking
Export prompts (Markdown)
Not Included ❌ (Post-MVP)
Starter templates
Team collaboration
Version history
Custom tech stacks
Analytics dashboard
GitHub integration
Multi-language

Deployment
Dev (Docker Compose)
postgres, redis, backend, celery_worker, frontend

Prod
Backend: Railway/Render (FastAPI + Celery)
Frontend: Vercel
Database: Railway Postgres
Redis: Upstash/Railway Redis
Environment Variables
DATABASE_URL
REDIS_URL
ANTHROPIC_API_KEY
OPENAI_API_KEY
SECRET_KEY (JWT)
NEXT_PUBLIC_API_URL


Key Implementation Requirements
Persistence: All workflow state saved to DB (survives disconnects)
Async: FastAPI async endpoints, Celery for long tasks
Markdown: Agent communication uses Markdown (34-38% token savings vs JSON)
Error Handling: Agents retry on failure, emit error events
State Management: Project status tracks workflow stage
WebSocket Auth: JWT verification on Socket.IO connect
Cost Tracking: Log tokens/cost to user_sessions table
