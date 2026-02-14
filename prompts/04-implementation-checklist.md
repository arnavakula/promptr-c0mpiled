# Implementation Checklist

## Overview

This is the step-by-step build guide for Promptr MVP. Follow these phases sequentially. Each phase has clear deliverables and verification steps.

**Estimated Timeline:** 48-72 hours  
**Priority:** Core workflow first, polish later

---

## Phase 1: Project Foundation (2-3 hours)

### 1.1 Repository Setup
- [ ] Create monorepo structure:
  ```
  /promptr
    /backend
    /frontend
    docker-compose.yml
    README.md
  ```
- [ ] Initialize git repository
- [ ] Create `.gitignore` for Python and Node.js
- [ ] Set up environment variable templates (`.env.example`)

### 1.2 Backend Foundation
- [ ] Initialize FastAPI project in `/backend`
- [ ] Create directory structure (from architecture doc):
  ```
  /app
    /api/routes
    /models
    /schemas
    /services
    /agents
    /tasks
    /websocket
    /utils
  ```
- [ ] Set up `requirements.txt` with core dependencies:
  ```
  fastapi
  uvicorn
  sqlalchemy
  psycopg2-binary
  pydantic
  python-jose[cryptography]
  passlib[bcrypt]
  python-socketio
  celery
  redis
  anthropic
  openai
  ```
- [ ] Create `main.py` with basic FastAPI app
- [ ] Set up `config.py` to load environment variables

### 1.3 Frontend Foundation
- [ ] Initialize Next.js 14 app in `/frontend`:
  ```bash
  npx create-next-app@latest frontend --typescript --tailwind --app
  ```
- [ ] Install core dependencies:
  ```
  socket.io-client
  axios
  swr
  ```
- [ ] Install shadcn/ui:
  ```bash
  npx shadcn-ui@latest init
  ```
- [ ] Set up directory structure (from architecture doc)

### 1.4 Docker Setup
- [ ] Create `docker-compose.yml` with:
  - PostgreSQL service
  - Redis service
  - Backend service
  - Celery worker service
  - Frontend service
- [ ] Test: `docker-compose up` runs without errors
- [ ] Verify: Can access frontend at localhost:3000, backend at localhost:8000

**Verification:**
- [ ] All services start successfully
- [ ] FastAPI docs accessible at `/docs`
- [ ] Next.js dev server running
- [ ] PostgreSQL and Redis containers healthy

---

## Phase 2: Database & Core Models (3-4 hours)

### 2.1 Database Setup
- [ ] Create `database.py` with SQLAlchemy engine setup
- [ ] Implement `get_db()` dependency for database sessions
- [ ] Test database connection

### 2.2 User Model & Auth
- [ ] Create `models/user.py`:
  - id, email, password_hash, full_name
  - projects_created, max_projects (default 3)
  - is_active, created_at, updated_at
- [ ] Create `schemas/auth.py`:
  - UserCreate, UserLogin, UserResponse, Token
- [ ] Implement `services/auth_service.py`:
  - Password hashing (bcrypt)
  - JWT token generation/validation
  - User authentication logic
- [ ] Create auth endpoints in `api/routes/auth.py`:
  - POST /auth/register
  - POST /auth/login
  - GET /auth/me
- [ ] Create `api/dependencies.py` with `get_current_user` dependency

**Test:**
- [ ] Register a new user
- [ ] Login and receive JWT token
- [ ] Access protected route with token

### 2.3 Project Model
- [ ] Create `models/project.py`:
  - All fields from database schema
  - Relationships to User
- [ ] Create `schemas/project.py`:
  - ProjectCreate, ProjectResponse, ProjectUpdate
- [ ] Create project CRUD in `services/project_service.py`

### 2.4 Supporting Models
- [ ] Create `models/conversation_event.py`
- [ ] Create `models/prompt.py`
- [ ] Create `models/user_session.py` (cost tracking)
- [ ] Create database migration script or use Alembic

**Verification:**
- [ ] All tables created in PostgreSQL
- [ ] Can create/read/update/delete records
- [ ] Relationships working correctly

---

## Phase 3: Agent Framework (6-8 hours)

### 3.1 Base Agent Infrastructure
- [ ] Create `agents/base_agent.py`:
  - Abstract base class
  - `execute()` method (abstract)
  - `get_system_prompt()` method (abstract)
  - `_call_llm()` helper method
- [ ] Create `utils/llm_client.py`:
  - Unified client for Anthropic and OpenAI APIs
  - Error handling and retries
  - Token counting
- [ ] Create `utils/cost_calculator.py`:
  - Calculate costs based on model and tokens
  - Pricing dictionary for each model

### 3.2 System Prompts
- [ ] Create `/agents/prompts/` directory
- [ ] Copy system prompts from `03-agent-system-prompts.md`:
  - elicitor_prompt.md
  - architect_prompt.md
  - synthesizer_prompt.md
  - critic_prompt.md

### 3.3 Elicitor Agent
- [ ] Create `agents/elicitor.py`:
  - Inherit from BaseAgent
  - Model: Claude 3.5 Haiku
  - Implement `execute()` method
  - Parse Markdown questions into structured format
- [ ] Test with sample vague ideas
- [ ] Verify: Generates 1-3 questions appropriately

### 3.4 Architect Agent
- [ ] Create `agents/architect.py`:
  - Model: Claude Sonnet 4
  - Implement `execute()` method
  - Generate spec.md from requirements
  - Extract tech stack from spec
- [ ] Test with sample requirements
- [ ] Verify: Spec.md has all required sections

### 3.5 Synthesizer Agent
- [ ] Create `agents/synthesizer.py`:
  - Model: Claude Sonnet 4
  - Implement `execute()` method
  - Generate 5-6 sequential prompts
  - Parse prompts into structured format
  - Implement `refine_section()` for targeted refinements
- [ ] Test with sample spec.md
- [ ] Verify: Generates complete prompt package

### 3.6 Critic Agent
- [ ] Create `agents/critic.py`:
  - Model: GPT-4o-mini
  - Implement `execute()` method
  - Parse JSON audit response
  - Categorize issues by severity
- [ ] Test with sample prompts (good and bad)
- [ ] Verify: Detects missing details, lazy outputs

### 3.7 Orchestrator
- [ ] Create `agents/orchestrator.py`:
  - No LLM (pure logic)
  - Initialize all specialist agents
  - Implement workflow state machine
  - Implement `execute_workflow()` method
  - Handle stage transitions
  - Emit WebSocket events at each stage
- [ ] Test end-to-end workflow (mocked user input)

**Verification:**
- [ ] Each agent can be called independently
- [ ] Agents return expected output formats
- [ ] Orchestrator coordinates full workflow
- [ ] Error handling works (retry logic)

---

## Phase 4: Background Jobs (3-4 hours)

### 4.1 Celery Setup
- [ ] Create `tasks/celery_app.py`:
  - Configure Celery with Redis broker
  - Set task timeouts and limits
- [ ] Test Celery worker starts: `celery -A app.tasks.celery_app worker`

### 4.2 Workflow Tasks
- [ ] Create `tasks/workflow_tasks.py`:
  - `start_project_workflow(project_id)` task
  - `process_user_response(project_id, answers)` task
  - `refine_prompts_task(project_id, refinement_request, target_section)` task
- [ ] Each task should:
  - Update project status in database
  - Call appropriate agents via Orchestrator
  - Emit WebSocket events for progress
  - Handle errors gracefully

**Test:**
- [ ] Queue a task manually
- [ ] Verify task executes in Celery worker
- [ ] Check database updates correctly
- [ ] Confirm error handling works

---

## Phase 5: WebSocket Real-Time (2-3 hours)

### 5.1 Backend WebSocket
- [ ] Create `websocket/socket_manager.py`:
  - Initialize Socket.IO server
  - Handle connection/disconnection
  - JWT authentication on connect
  - Room management (project-based rooms)
  - Event emission utilities
- [ ] Mount Socket.IO to FastAPI app
- [ ] Define event types:
  - `progress_update`
  - `questions_ready`
  - `spec_ready`
  - `prompts_generated`
  - `workflow_completed`
  - `workflow_failed`
  - `refinement_completed`

### 5.2 Frontend WebSocket
- [ ] Create `lib/socket.ts`:
  - Socket.IO client wrapper
  - Connection management
  - Event listeners
  - Auto-reconnect logic
- [ ] Create `hooks/useSocket.ts`:
  - React hook for socket connection
  - Handle connection state
  - Provide event subscription methods

**Test:**
- [ ] Frontend connects to backend via WebSocket
- [ ] Events sent from backend appear in frontend console
- [ ] Reconnection works after disconnect

---

## Phase 6: API Endpoints (4-5 hours)

### 6.1 Project Endpoints
- [ ] Create `api/routes/projects.py`:
  - GET /api/projects (list user's projects)
  - POST /api/projects (create new, queue workflow)
  - GET /api/projects/{id} (get project details)
  - PATCH /api/projects/{id}/respond (submit answers)
  - POST /api/projects/{id}/refine (request refinement)
  - DELETE /api/projects/{id}
  - GET /api/projects/{id}/conversation (get history)
  - GET /api/projects/{id}/prompts (get final prompts)
  - POST /api/projects/{id}/export (download markdown)
- [ ] All endpoints use `get_current_user` dependency
- [ ] Implement rate limiting checks
- [ ] Add input validation with Pydantic

### 6.2 User Endpoints
- [ ] Create `api/routes/users.py`:
  - GET /api/users/me/stats (usage statistics)
- [ ] Include projects_created, projects_remaining, estimated_cost

### 6.3 Rate Limiting Service
- [ ] Create `services/rate_limit_service.py`:
  - `check_project_limit(user)` - max 3 projects
  - `check_refinement_limit(project)` - max 3 refinements
  - `increment_usage(user)`
  - `track_cost(user_id, project_id, tokens, cost)`
- [ ] Enforce limits in project endpoints

**Test:**
- [ ] All endpoints return correct responses
- [ ] Rate limits enforced
- [ ] Protected endpoints require auth
- [ ] Error responses are consistent

---

## Phase 7: Frontend Core UI (6-8 hours)

### 7.1 Authentication Pages
- [ ] Create `/app/(auth)/login/page.tsx`:
  - Login form
  - Call POST /auth/login
  - Store JWT in localStorage or cookie
  - Redirect to dashboard on success
- [ ] Create `/app/(auth)/register/page.tsx`:
  - Registration form
  - Call POST /auth/register
  - Handle validation errors
- [ ] Create `lib/auth.ts`:
  - Auth context provider
  - Token storage
  - Auto-login on refresh
- [ ] Create `hooks/useAuth.ts`:
  - Login/logout functions
  - Current user state

### 7.2 Dashboard Layout
- [ ] Create `/app/(dashboard)/layout.tsx`:
  - Navigation bar
  - User menu (logout, stats)
  - Protected route wrapper
- [ ] Create `/app/(dashboard)/dashboard/page.tsx`:
  - List of user's projects
  - Create new project button
  - Project cards showing status
  - Empty state if no projects

### 7.3 Project Workflow Page
- [ ] Create `/app/(dashboard)/projects/[id]/page.tsx`:
  - Main workflow interface
  - Shows current stage
  - Real-time progress updates via WebSocket
  - Dynamic content based on project status:
    - `eliciting`/`awaiting_answers`: Show questions, answer form
    - `planning`/`awaiting_approval`: Show spec.md preview, approve/edit buttons
    - `synthesizing`/`critiquing`: Show progress spinner
    - `completed`: Redirect to prompts page
- [ ] Create components:
  - `components/project/WorkflowStepper.tsx` - Visual progress indicator
  - `components/project/QuestionForm.tsx` - Dynamic question rendering
  - `components/project/SpecPreview.tsx` - Spec.md display with approval

### 7.4 Prompts Display Page
- [ ] Create `/app/(dashboard)/projects/[id]/prompts/page.tsx`:
  - Display all final prompts sequentially
  - Copy-to-clipboard for each prompt
  - Download all as markdown
  - Refinement interface (if under limit)
- [ ] Create `components/project/PromptCard.tsx`:
  - Prompt title, number, content
  - Completion checklist
  - Copy button
  - Collapsible for long prompts

### 7.5 API Client
- [ ] Create `lib/api-client.ts`:
  - Axios instance with base URL
  - Auth token interceptor
  - Error handling interceptor
- [ ] Create data fetching hooks using SWR:
  - `hooks/useProject.ts`
  - `hooks/useProjects.ts`

**Test:**
- [ ] Can register and login
- [ ] Dashboard shows projects
- [ ] Can create new project
- [ ] Workflow UI updates in real-time
- [ ] Spec.md approval works
- [ ] Final prompts display correctly

---

## Phase 8: Integration & Testing (4-5 hours)

### 8.1 End-to-End Workflow Test
- [ ] Create test user account
- [ ] Submit vague idea (e.g., "fitness tracker")
- [ ] Answer questions from Elicitor
- [ ] Review and approve spec.md
- [ ] Wait for prompts to generate
- [ ] Verify all 5-6 prompts are complete and correct
- [ ] Test refinement (request UI change)
- [ ] Download prompt package

### 8.2 Edge Case Testing
- [ ] Test rate limits:
  - Try creating 4th project (should fail)
  - Try 4th refinement (should fail)
- [ ] Test disconnection:
  - Start workflow, close browser
  - Reopen, verify workflow continued
- [ ] Test concurrent users:
  - Two users creating projects simultaneously
- [ ] Test error scenarios:
  - Invalid answers
  - LLM API timeout
  - Database connection error

### 8.3 Cost Tracking Verification
- [ ] Verify tokens/cost logged to `user_sessions` table
- [ ] Check cost estimates are accurate
- [ ] Confirm user stats endpoint returns correct usage

**Fix any bugs found during testing**

---

## Phase 9: Polish & UX (3-4 hours)

### 9.1 Loading States
- [ ] Add loading spinners for all async operations
- [ ] Add skeleton screens for project list
- [ ] Add progress indicators during workflow stages

### 9.2 Error Handling
- [ ] User-friendly error messages throughout
- [ ] Toast notifications for success/error
- [ ] Graceful degradation if WebSocket fails

### 9.3 Empty States
- [ ] Empty project list: "Create your first project"
- [ ] No conversation history yet
- [ ] Project failed state with retry option

### 9.4 Visual Polish
- [ ] Consistent spacing and typography
- [ ] Smooth transitions between states
- [ ] Mobile responsiveness (basic)
- [ ] Accessibility (keyboard navigation, ARIA labels)

### 9.5 Copy & Messaging
- [ ] Review all user-facing text
- [ ] Ensure instructions are clear
- [ ] Add helpful tooltips where needed

---

## Phase 10: Deployment (3-4 hours)

### 10.1 Backend Deployment (Railway/Render)
- [ ] Create new project on Railway or Render
- [ ] Add PostgreSQL database service
- [ ] Add Redis service
- [ ] Configure environment variables:
  - DATABASE_URL
  - REDIS_URL
  - ANTHROPIC_API_KEY
  - OPENAI_API_KEY
  - SECRET_KEY
- [ ] Deploy backend service
- [ ] Deploy Celery worker (separate service)
- [ ] Run database migrations
- [ ] Verify health check endpoint works

### 10.2 Frontend Deployment (Vercel)
- [ ] Create new project on Vercel
- [ ] Connect GitHub repository
- [ ] Configure environment variables:
  - NEXT_PUBLIC_API_URL (backend URL)
- [ ] Deploy frontend
- [ ] Verify production build works

### 10.3 Production Testing
- [ ] Test full workflow in production
- [ ] Verify WebSocket connection works
- [ ] Check CORS configuration
- [ ] Test on mobile device
- [ ] Monitor error logs (Sentry if set up)

### 10.4 Documentation
- [ ] Update README with:
  - Setup instructions
  - Environment variables needed
  - How to run locally
  - How to deploy
- [ ] Document any known issues
- [ ] Add API documentation link

**Verification:**
- [ ] Production app fully functional
- [ ] All workflows tested in production
- [ ] Error monitoring set up
- [ ] Documentation complete

---

## Phase 11: Beta Launch Prep (2-3 hours)

### 11.1 User Registration Cap
- [ ] Implement 80-user registration limit
- [ ] Add "Beta Full" message when limit reached
- [ ] Consider waitlist functionality (optional)

### 11.2 Monitoring & Analytics
- [ ] Set up basic error tracking (Sentry)
- [ ] Set up analytics (PostHog or simple logging)
- [ ] Monitor API costs daily
- [ ] Track user activity and completion rates

### 11.3 Beta User Communication
- [ ] Create onboarding email/message
- [ ] Add in-app tips for first-time users
- [ ] Prepare feedback collection method

### 11.4 Final Checks
- [ ] All rate limits working
- [ ] Cost tracking accurate
- [ ] No obvious security issues
- [ ] Performance acceptable (< 30s per workflow)

---

## MVP Feature Checklist

### Core Features (Must Have)
- [x] User registration and authentication
- [x] Create project from vague idea
- [x] AI asks 1-3 clarifying questions
- [x] User answers questions
- [x] AI generates spec.md
- [x] User approves spec.md
- [x] AI generates 5-6 sequential prompts
- [x] Critic auto-reviews prompts
- [x] User receives final prompt package
- [x] User can refine specific sections
- [x] Download prompts as markdown
- [x] Real-time progress updates
- [x] Save all project data
- [x] View conversation history

### Rate Limits (Must Have)
- [x] Max 80 users
- [x] Max 3 projects per user
- [x] Max 3 refinements per project
- [x] Max 3 questions per elicitation
- [x] 10-minute workflow timeout

### Not Included in MVP
- [ ] Starter templates
- [ ] Team collaboration
- [ ] Version history
- [ ] Custom tech stacks
- [ ] Prompt analytics
- [ ] GitHub integration
- [ ] Multi-language support
- [ ] Payment system

---

## Troubleshooting Common Issues

### Celery tasks not running
- Check Redis connection
- Verify Celery worker is running
- Check task queue: `redis-cli KEYS *`

### WebSocket not connecting
- Check CORS configuration
- Verify Socket.IO versions match (client/server)
- Check browser console for connection errors

### LLM API timeouts
- Increase timeout in llm_client.py
- Implement retry logic with exponential backoff
- Check API key and rate limits

### Database connection errors
- Verify DATABASE_URL format
- Check PostgreSQL service is running
- Ensure database migrations ran successfully

### Frontend not updating
- Check WebSocket connection established
- Verify project ID in URL is correct
- Check SWR cache isn't stale

---

## Success Criteria

**MVP is complete when:**
- [ ] A user can go from vague idea to final prompts in < 5 minutes (active time)
- [ ] All 5 workflow stages work reliably
- [ ] Rate limits enforce correctly
- [ ] Real-time updates work consistently
- [ ] Error handling prevents crashes
- [ ] Production deployment stable
- [ ] Cost per project < $0.60
- [ ] 5 test users complete full workflow successfully

---

## Next Steps After MVP

1. Gather beta user feedback
2. Monitor costs and performance
3. Identify most common failure points
4. Plan Phase 2 features based on usage
5. Consider adding starter templates
6. Evaluate need for more sophisticated agent patterns
