# StudyOS

> AI-powered personal learning operating system.

StudyOS is a single-user-first learning agent that turns study conversations into durable learning state: concepts, attempts, mistakes, mastery, and review tasks.

## V0.1 product goal

The MVP closes one loop:

```text
learn -> diagnose -> record evidence -> update mastery -> schedule review -> learn again
```

The AI is **not** the source of truth for mastery. The model interprets answers and produces structured evidence; deterministic TypeScript business logic updates mastery and review schedules.

## Stack

- Next.js 16 + React 19
- TypeScript
- Tailwind CSS 4
- Hono
- OpenAI Agents SDK
- Zod 4
- Prisma ORM 7
- MySQL 8
- Vitest

## Core architecture

```text
Browser
  |
  v
Next.js UI
  |
  v
Hono API (/api/*)
  |
  +------------------+
  |                  |
  v                  v
Study services    Study Agent
  |                  |
  |               Function tools
  |                  |
  +--------+---------+
           |
           v
      Prisma + MySQL
```

### Two kinds of memory

**Conversation memory** answers “what are we talking about right now?”

**Learning memory** answers “what does the learner know, where do they fail, and what should be reviewed next?”

StudyOS V0.1 persists learning memory in MySQL. Conversation history is supplied by the client per turn; a persistent agent-session backend is intentionally deferred until the core learning loop is proven.

## Data model

The important chain is:

```text
Subject -> Topic -> Concept
                    |
                    +-> LearningState
                    +-> Question -> Attempt -> Mistake
                    +-> LearningEvent
                    +-> ReviewTask

User -> StudySession
```

`LearningEvent` is append-only evidence. `LearningState` is the current projection calculated from that evidence.

## Agent boundaries

The Study Agent may:

- inspect a concept and its mastery state;
- inspect prerequisite mastery;
- inspect recent mistakes;
- inspect due reviews;
- create a diagnostic/practice question;
- record an evaluated answer;
- finish a study session.

The Study Agent may **not**:

- execute SQL or shell commands;
- delete data;
- set mastery directly;
- bypass the service layer;
- invent learner history.

## Quick start

### 1. Requirements

- Node.js 22+
- MySQL 8+
- an OpenAI API key

### 2. Install

```bash
npm install
```

### 3. Start MySQL

```bash
docker compose up -d mysql
```

### 4. Configure environment

```bash
cp .env.example .env
```

Set `OPENAI_API_KEY`.

### 5. Create the database

```bash
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
```

### 6. Start

```bash
npm run dev
```

Open http://localhost:3000.

## Useful commands

```bash
npm run dev
npm run build
npm run typecheck
npm test

npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Pages

- `/` — dashboard: due reviews, weak concepts, recent progress
- `/study` — study session + agent conversation
- `/knowledge` — concept tree and mastery
- `/reviews` — review queue

## API

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/knowledge`
- `GET /api/reviews/today`
- `POST /api/sessions`
- `POST /api/agent/message`

## Mastery V0.1

A single practice result becomes a performance score `S` from correctness, reasoning, and independence.

```text
S = 0.50 * correctness
  + 0.30 * reasoning
  + 0.20 * independence
```

Mastery then updates with an exponential moving average:

```text
M_new = (1 - alpha) * M_old + alpha * S
alpha = 0.25
```

The first version deliberately uses a transparent deterministic rule. It can later be replaced without changing the agent contract because raw `LearningEvent` evidence is retained.

## Roadmap

### V0.1 — closed learning loop
- [x] architecture and data model
- [x] deterministic mastery/review engine
- [x] Study Agent tool contract
- [x] dashboard / study / knowledge / reviews UI skeleton
- [x] seed curriculum
- [ ] real-world usage and agent eval set

### V0.2 — stronger learner model
- study goals and planning
- mistake-pattern analytics
- review prioritization
- session summaries
- improved mastery calibration

### V0.3 — sources
- notes and textbook sources
- PDF ingestion
- concept-to-source mapping
- retrieval only where it improves teaching

### V0.4 — knowledge graph assistance
- AI-assisted concept extraction
- proposed prerequisite links with user confirmation

### V1.0 — specialized tutors
Only after a single Study Agent becomes difficult to maintain:
- economics tutor
- mathematics tutor
- English tutor
- manager/planner orchestration

## Design docs

See [docs/PRODUCT.md](docs/PRODUCT.md) for the product contract and phased development plan.

## Status

V0.1 foundation. Single-user development mode uses `DEFAULT_USER_EMAIL`; authentication is intentionally deferred until the learning loop is stable.
