# AGENTS.md — StudyOS Development Guardrails

This file is the short operational brief for any coding agent or developer working in this repository.

## Before changing code

Read, in order:

1. `docs/README.md`
2. `docs/STATUS.md`
3. `docs/ROADMAP.md`
4. the relevant architecture document:
   - `docs/PRODUCT.md`
   - `docs/ARCHITECTURE.md`
   - `docs/DATA_MODEL.md`
   - `docs/AGENT_CONTRACT.md`

Do not infer implementation status from VISION or ROADMAP.

## Current stage

StudyOS is in **V0.1 early development**.

The immediate goal is:

> make the existing learning loop reliable, testable, reproducible, and understandable.

Do not prioritize future-phase features while Phase 0 / Phase 1 gaps remain.

## Product invariant

StudyOS is a learner-model system, not a chat wrapper.

The core loop is:

```text
Evidence
→ Learning State
→ Next Decision
→ Learning Action
→ New Evidence
```

## Architecture invariants

### Allowed dependencies

```text
UI → API → Service → Prisma
Agent → Tool → Service → Prisma
```

### Forbidden shortcuts

Do not introduce:

```text
UI → Prisma
Agent → Prisma
Agent → raw SQL
Tool → raw SQL
Agent → shell
LLM → direct mastery mutation
```

## Learning-state rules

- `LearningEvent` is evidence history.
- `LearningState` is a current projection.
- Attempts that affect mastery must be attached to a persisted Question.
- Mastery and review scheduling are deterministic business logic.
- The LLM may evaluate an answer but may not set mastery or review dates directly.
- Multi-table learning updates should be transactional.
- Do not silently overwrite historical evidence.

## Agent rules

Current architecture is **one Study Agent + narrow tools**.

Do not add another Agent unless there is evidence of:

- prompt conflict;
- context overload;
- domain evaluator incompatibility;
- routing complexity demonstrated by traces/evals.

New Agent tools must:

1. expose minimum capability;
2. validate parameters;
3. hide `userId` from model control;
4. call a Service;
5. define failure behavior;
6. update `docs/AGENT_CONTRACT.md`;
7. add tests/evals.

## Complexity rule

Do not introduce these without a roadmap gate and concrete need:

- Redis
- queues
- Vector DB
- Neo4j
- microservices
- multi-agent orchestration
- PDF/RAG
- OCR
- payment
- multi-tenant infrastructure

Complexity must solve an observed problem.

## Current priority

Use `docs/ROADMAP.md` as the authority.

At the time this file was created, highest priority includes:

- repository reproducibility;
- committed lockfile;
- committed initial migration;
- CI production build;
- DB integration tests;
- V0.1 review/session/concept/mistake loop reliability;
- Agent eval foundation.

Always re-check ROADMAP before acting.

## Definition of Done

A code change is not done until appropriate items are complete:

- behavior implemented;
- architecture boundary preserved;
- input validation;
- error handling;
- tests;
- typecheck;
- build;
- migration if needed;
- docs updated;
- STATUS / ROADMAP updated when the project state changes.

## Documentation changes

Update:

- data model change → `docs/DATA_MODEL.md`
- Agent/tool change → `docs/AGENT_CONTRACT.md`
- architecture change → `docs/ARCHITECTURE.md` + `docs/DECISIONS.md`
- milestone completion / technical debt → `docs/STATUS.md`
- priority change → `docs/ROADMAP.md`
- product acceptance change → `docs/PRODUCT.md`

## When uncertain

Prefer:

- smaller vertical slices;
- deterministic code;
- explicit state;
- typed schemas;
- tests;
- documented assumptions.

Avoid inventing a future architecture that the current product has not earned.
