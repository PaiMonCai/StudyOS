# StudyOS

> AI-powered personal learning operating system.

StudyOS is a single-user-first learning agent that turns real study activity into durable learning state: concepts, attempts, mistakes, mastery estimates, and review tasks.

> **Development status:** V0.1 early development. The repository has a runnable foundation, not a production-ready product.

## Start here

If you are continuing development, **read the documentation map first**:

**[docs/README.md](docs/README.md)**

The most important documents are:

| Document | Purpose |
| --- | --- |
| [VISION](docs/VISION.md) | Long-term product direction and non-negotiable principles |
| [PRODUCT](docs/PRODUCT.md) | Current product contract and learning loop |
| [STATUS](docs/STATUS.md) | What is actually implemented / partial / missing |
| [ROADMAP](docs/ROADMAP.md) | Development order and phase gates |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Runtime layers and dependency boundaries |
| [DATA MODEL](docs/DATA_MODEL.md) | Data semantics and invariants |
| [AGENT CONTRACT](docs/AGENT_CONTRACT.md) | Agent permissions, tools, evaluation rules |
| [DEVELOPMENT](docs/DEVELOPMENT.md) | Workflow, Definition of Done, review checklist |
| [TESTING](docs/TESTING.md) | Unit/integration/E2E + Agent eval strategy |
| [DECISIONS](docs/DECISIONS.md) | Architecture decision log |

## Product thesis

StudyOS is **not a chat wrapper**.

The durable product loop is:

```text
learning evidence
      ↓
learner state
      ↓
next learning decision
      ↓
learning action
      ↓
new evidence
```

The core question is:

> Does StudyOS make the next study decision better because it remembers and structures evidence from previous sessions?

## V0.1 loop

```text
learn
→ diagnose
→ persist question
→ answer
→ structured evaluation
→ record evidence
→ update mastery deterministically
→ create mistake if needed
→ schedule review
→ learn again
```

The LLM is **not** the source of truth for mastery. It interprets learner answers and creates structured evidence; deterministic TypeScript business logic updates learning state and review schedules.

## Current architecture

```text
Browser
  ↓
Next.js UI
  ↓
Hono API
  ↓
┌────────────────┐
│                │
▼                ▼
Services     Study Agent
│                │
│             Tools
└───────┬────────┘
        ▼
     Services
        ↓
     Prisma
        ↓
      MySQL
```

Important boundary:

```text
Agent → Tool → Service → Prisma
```

The Agent never receives raw database, SQL, shell, or direct mastery mutation capability.

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

## Quick start

Requirements:

- Node.js >= 22.18
- Docker / MySQL 8
- OpenAI API key

```bash
git clone https://github.com/PaiMonCai/StudyOS.git
cd StudyOS

npm install
cp .env.example .env
```

Set `OPENAI_API_KEY`, then:

```bash
docker compose up -d mysql

npm run db:generate
npm run db:migrate -- --name init
npm run db:seed

npm run dev
```

Open:

```text
http://localhost:3000
```

> Current reproducibility gaps (package lock, committed initial migration, build CI, integration tests) are intentionally tracked in [STATUS.md](docs/STATUS.md) and prioritized in [ROADMAP.md](docs/ROADMAP.md).

## Pages

- `/` — dashboard
- `/study` — Study Agent session
- `/knowledge` — knowledge state
- `/reviews` — due reviews

## Current API

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/knowledge`
- `GET /api/reviews/today`
- `POST /api/sessions`
- `POST /api/agent/message`

## Current Study Agent tools

- `search_concepts`
- `get_learning_state`
- `get_prerequisites`
- `get_recent_mistakes`
- `get_due_reviews`
- `create_question`
- `get_current_question`
- `record_attempt`
- `finish_study_session`

See [AGENT_CONTRACT.md](docs/AGENT_CONTRACT.md) before modifying Agent behavior or adding tools.

## Development rule

Before starting a new feature:

```text
STATUS
  ↓
ROADMAP
  ↓
relevant product / architecture document
  ↓
code
  ↓
tests
  ↓
documentation update
```

Do not infer implementation status from the long-term vision.

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

## Scope discipline

Until the core learning loop is reliable, do **not** prioritize:

- multi-agent orchestration
- Redis / queues
- Neo4j
- vector database
- PDF / OCR / RAG
- teacher dashboard
- payment
- multi-tenant architecture

Complexity must be justified by real product evidence.

## License / status

Private early-stage project. V0.1 foundation under active development.
