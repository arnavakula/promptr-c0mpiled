# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Docker (primary development method)
```bash
docker compose up                # Start all services (postgres, redis, backend, celery_worker, frontend)
docker compose up --build        # Rebuild and start
docker compose down              # Stop all services
```

### Backend (inside Docker)
```bash
docker compose exec backend python -m pytest                    # Run all tests
docker compose exec backend python -m pytest tests/test_auth.py # Run single test file
docker compose exec backend python -m <module_name>             # Run a script as module
```

### Frontend
```bash
cd frontend && npm run dev       # Dev server (localhost:3000)
cd frontend && npm run build     # Production build
cd frontend && npm run lint      # ESLint
```

### Services
- Backend API: http://localhost:8000 (Swagger: /docs, ReDoc: /redoc)
- Frontend: http://localhost:3000
- Postgres: localhost:5432 (user: promptr, db: promptr)
- Redis: localhost:6379

## Architecture

### Overview
Promptr is a multi-agent AI system that generates tailored development prompts from a user's app idea. Monorepo with `/backend` (FastAPI + Celery) and `/frontend` (Next.js 14 App Router).

### Agent Pipeline
The core workflow is a state machine orchestrated by `backend/app/agents/orchestrator.py`:

```
eliciting → awaiting_answers → planning → awaiting_approval → synthesizing → critiquing → [refining] → completed
```

| Agent | File | Model | Role |
|-------|------|-------|------|
| Elicitor | `agents/elicitor.py` | claude-haiku-4-5-20251001 | Generates clarifying questions |
| Architect | `agents/architect.py` | claude-sonnet-4-20250514 | Creates spec.md from answers |
| Synthesizer | `agents/synthesizer.py` | claude-sonnet-4-20250514 | Transforms spec into sequential prompts |
| Critic | `agents/critic.py` | gpt-4o-mini | Quality audit (different provider to reduce bias) |
| Orchestrator | `agents/orchestrator.py` | None (pure logic) | Routes between agents, manages WorkflowState |

All agents inherit from `BaseAgent` (`agents/base_agent.py`) and implement `execute()` + `get_system_prompt()`. System prompts live as `.md` files in `agents/prompts/`.

### Backend Key Patterns
- **LLM Client**: Singleton at `app.utils.llm_client.llm_client` — routes to Anthropic or OpenAI based on model ID, handles retries
- **Celery Tasks**: `app/tasks/workflow_tasks.py` bridges the orchestrator with the database for async workflow execution
- **WebSocket**: Socket.IO at `/ws/socket.io` for real-time project updates during workflow, JWT auth on connect
- **Auth**: JWT (HS256, 24h expiry) via `app/services/auth_service.py`, dependency injection via `app/api/dependencies.py`
- **Models**: SQLAlchemy ORM — `Project.workflow_data` is JSONB storing full workflow state
- **Config**: Pydantic BaseSettings in `app/config.py`, reads from `.env`

### Frontend Key Patterns
- **App Router**: Route groups `(auth)` and `(dashboard)` with shared layouts
- **Auth**: `useAuth` context in `lib/auth.ts`, token in localStorage, Axios interceptor in `lib/api-client.ts`
- **Data Fetching**: SWR hooks in `hooks/useProjects.ts` with polling (~3-5s) for workflow status
- **Real-time**: Socket.IO client in `lib/socket.ts` + `hooks/useSocket.ts`
- **UI**: Tailwind CSS + shadcn/ui components in `components/ui/`

### API Routes
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/projects`, `POST /api/projects` (creates + starts async workflow)
- `GET /api/projects/{id}`, `PATCH /api/projects/{id}/respond` (submit answers)
- `PATCH /api/projects/{id}/approve` (approve spec), `PATCH /api/projects/{id}/refine`

## Dependency Pinning
- `bcrypt==4.0.1` is pinned — newer versions cause passlib hash length errors
- `anthropic>=0.39.0` and `openai>=1.50.0` are minimum versions to avoid `proxies` kwarg errors
