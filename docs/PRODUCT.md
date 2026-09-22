# StudyOS V0.1 — Product & Development Contract

> **Document role:** this file defines the current product contract and V0.1 acceptance criteria.  
> For actual implementation status see [STATUS.md](./STATUS.md).  
> For future priority see [ROADMAP.md](./ROADMAP.md).  
> For system boundaries see [ARCHITECTURE.md](./ARCHITECTURE.md) and [AGENT_CONTRACT.md](./AGENT_CONTRACT.md).

## 1. Product thesis

StudyOS is not a chat wrapper. Its durable value is a learner model that becomes more useful after every meaningful study event.

The system must answer four questions:

1. What concepts exist and how are they related?
2. What evidence do we have about the learner?
3. What is the current learning state projected from that evidence?
4. What should the learner do next?

## 2. Primary user

V0.1 is deliberately single-user-first.

The product assumes one learner studying several domains such as economics, mathematics, and English. Multi-user auth, classrooms, teachers, subscriptions, and social features are out of scope.

## 3. Product loop

```text
Choose / mention a concept
        |
        v
Agent resolves concept
        |
        v
Read mastery + prerequisites + mistakes
        |
        v
Choose teaching action
        |
        +--> explain
        +--> diagnose
        +--> ask persisted question
        +--> review
        |
        v
Evaluate answer into structured evidence
        |
        v
Deterministic Learning Engine
        |
        +--> Attempt
        +--> LearningEvent
        +--> LearningState
        +--> Mistake
        +--> ReviewTask
        |
        v
Next session starts from updated state
```

## 4. Non-goals for V0.1

Do not add yet:

- multi-agent orchestration;
- vector databases;
- PDF ingestion;
- OCR;
- automatic web research;
- Redis / queues;
- Neo4j;
- complex authentication;
- teacher dashboards;
- payment;
- social features;
- a full note editor.

These are intentionally deferred until the learning loop produces real value.

## 5. Core product surfaces

### Dashboard

Must answer within five seconds:

- How am I doing?
- What is weak?
- What is due?
- Where should I start?

### Study

The main agent interaction surface.

A Study Session owns the active persisted question. This prevents the next HTTP request from losing which question is being evaluated.

### Knowledge

A readable hierarchy is preferred over a graph visualization in V0.1.

```text
Subject
  -> Topic
     -> Concept
        -> mastery
        -> confidence
        -> next review
```

### Reviews

Shows due review tasks ordered by priority and schedule.

## 6. Architecture rules

### Rule A — LLM interprets; code updates state

The model may produce:

- correctness;
- reasoning quality;
- independence;
- error type;
- misconceptions;
- textual feedback.

The model may not set mastery.

### Rule B — event-first learning data

`LearningEvent` preserves evidence so future mastery algorithms can be recalculated.

### Rule C — tools call services

Agent tools do not receive raw Prisma or SQL access.

```text
Agent Tool -> Service -> Prisma
```

### Rule D — least capability

Study Agent gets read operations and narrowly-scoped safe writes. It does not get delete, shell, SQL, or bulk mutation tools.

### Rule E — single agent first

A specialized economics/math/English agent split is only justified after a single Study Agent becomes hard to maintain or produces measurable routing conflicts.

## 7. Mastery V0.1

Performance:

```text
S = 0.50 * correctness
  + 0.30 * reasoning
  + 0.20 * independence
```

Mastery update:

```text
M_new = 0.75 * M_old + 0.25 * S
```

Review intervals:

- weak attempt or mastery < 0.40 -> 1 day
- mastery < 0.60 -> 3 days
- mastery < 0.80 -> 7 days
- mastery < 0.90 -> 14 days
- mastery >= 0.90 -> 30 days

This is intentionally simple and observable.

## 8. Error taxonomy

Stable enum:

- NONE
- CONCEPTUAL
- CALCULATION
- REASONING
- MEMORY
- CONDITION
- MISREAD
- CARELESS
- UNKNOWN

This makes future mistake-pattern analytics possible.

## 9. V0.1 acceptance criteria

The MVP is complete when all of these are true:

1. A concept can be created and displayed.
2. A learner has a persisted `LearningState`.
3. A Study Session can be created.
4. The agent can resolve a natural-language concept name to a concept ID.
5. The agent can inspect learning state.
6. The agent can inspect prerequisite mastery.
7. The agent can persist a diagnostic question before asking it.
8. A learner answer can be evaluated with a structured schema.
9. The attempt is persisted.
10. A `LearningEvent` explains why state changed.
11. Mastery updates deterministically.
12. A meaningful error creates a `Mistake`.
13. A new `ReviewTask` is scheduled.
14. A due review appears on Dashboard / Reviews.
15. Completing review practice closes the old due review.
16. The next session can use the updated learning state.

**Important:** items being implemented in code do not automatically mean the overall V0.1 product is accepted. End-to-end reliability, tests, and actual usage are tracked in [STATUS.md](./STATUS.md).

## 10. Development slices

### P0 — Foundation

- Next.js / Hono / TypeScript
- Prisma / MySQL
- local Docker database
- environment template

### P1 — Knowledge

- Subject
- Topic
- Concept
- ConceptRelation
- Knowledge page

### P2 — Learning engine

- Question
- Attempt
- LearningEvent
- LearningState
- pure deterministic tests

### P3 — Agent

- concept search
- learning-state reads
- prerequisite reads
- question persistence
- answer recording

### P4 — Mistakes

- stable taxonomy
- diagnosis text
- unresolved mistake retrieval

### P5 — Reviews

- deterministic review scheduling
- due queue
- close previous due reviews after practice

### P6 — Sessions

- active question ownership
- summary
- later: persistent agent session backend

### P7 — Dashboard

- weak concepts
- due reviews
- mastery average
- recent sessions

### P8 — Evals

Build a fixed eval set of at least 50 scenarios, including:

- low mastery -> basic teaching;
- high mastery -> harder diagnostic;
- weak prerequisite -> repair prerequisite;
- ambiguous concept name -> resolve before writing;
- answer with conceptual error -> create mistake;
- answer after hints -> lower independence;
- no active question -> do not write an attempt.

## 11. Success metric

The first meaningful product metric is not chat count.

It is:

> Does StudyOS make the next study decision better because of evidence collected in previous sessions?

Secondary metrics:

- review completion rate;
- mastery change after reviews;
- repeated misconception rate;
- percentage of sessions where the agent used relevant prior state;
- false-positive mistake diagnoses;
- learner correction of agent evaluation.

## 12. Where future work lives

This document intentionally no longer duplicates a long version roadmap.

Future sequencing and gates are maintained in:

**[ROADMAP.md](./ROADMAP.md)**

This avoids mixing “product contract” with “future wishlist”.
