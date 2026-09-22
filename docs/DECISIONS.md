# Architecture Decision Log

这是轻量 ADR（Architecture Decision Record）。

规则：

- 只记录影响长期方向的决定；
- 不记录普通实现细节；
- 新决定追加，不随意重写历史；
- 如果推翻旧决定，新建 ADR 并标记 supersedes。

---

## ADR-001 — Single Agent First

**Status:** Accepted  
**Date:** 2026-09-22

### Context

StudyOS 同时涉及经济学、数学、英语等未来领域，容易过早拆成 Tutor / Planner / Reviewer / Critic 等多个 Agent。

### Decision

V0.x 默认使用一个 Study Agent + narrow tools。

### Why

- 当前 tool 数量可控；
- 多 Agent 增加 routing 和 tracing 成本；
- 当前最大风险是 learning loop 数据可靠性；
- 尚无 eval 证明单 Agent 已达到维护极限。

### Revisit when

出现：

- domain prompt conflict；
- context overload；
- evaluator rubric incompatibility；
- complex routing。

---

## ADR-002 — LLM Does Not Own Mastery

**Status:** Accepted  
**Date:** 2026-09-22

### Decision

LLM 只提供 structured evaluation。

Mastery / Review scheduling 由 deterministic TypeScript engine 计算。

### Why

避免同样的回答因为模型随机性产生不同关键状态。

---

## ADR-003 — Event-first Learning Data

**Status:** Accepted  
**Date:** 2026-09-22

### Decision

保留 LearningEvent / Attempt 原始证据，同时维护 LearningState 当前投影。

### Why

未来 mastery 算法必然会调整。

如果只保存最新 mastery，将失去：

- 可解释性；
- replay；
- algorithm migration；
- debug evidence。

---

## ADR-004 — Tools Must Go Through Services

**Status:** Accepted  
**Date:** 2026-09-22

### Decision

```text
Agent → Tool → Service → Prisma
```

禁止 Agent / Tool 直接获得 raw Prisma client。

### Why

业务校验和事务不能依赖模型自觉遵守。

---

## ADR-005 — Modular Monolith

**Status:** Accepted  
**Date:** 2026-09-22

### Decision

当前使用 Next.js + Hono + Services + Prisma 的 TypeScript modular monolith。

### Why

- 单用户 early-stage；
- 部署简单；
- shared types 容易；
- transaction 边界清晰；
- 没有独立扩缩容需求。

### Revisit when

真实负载或团队边界要求独立服务，而不是因为“微服务更先进”。

---

## ADR-006 — MySQL as the Only Primary Store in V0.x

**Status:** Accepted  
**Date:** 2026-09-22

### Decision

V0.x 不引入 Redis / Vector DB / Neo4j 作为必要依赖。

### Why

核心模型目前都是结构化关系数据。

### Revisit when

出现：

- background jobs；
- cache pressure；
- retrieval needs；
- graph queries 无法合理用关系数据库完成。

---

## ADR-007 — Single-user-first

**Status:** Accepted  
**Date:** 2026-09-22

### Decision

早期采用 DEFAULT_USER development mode，不提前建设完整 auth / tenant system。

### Limitation

该模式不得作为公网多用户 production 安全方案。

### Revisit when

需要公网、跨设备或多用户。

---

## ADR-008 — One Active Graded Question per StudySession

**Status:** Accepted  
**Date:** 2026-09-22

### Decision

StudySession 通过 `currentQuestionId` 追踪一题 active graded question。

### Why

HTTP turn 之间必须明确：

> 用户当前回答的是哪一道题？

### Revisit when

引入：

- batch quiz；
- parallel exercises；
- multi-part graded tasks。

---

# ADR template

以后追加：

```markdown
## ADR-XXX — Title

**Status:** Proposed / Accepted / Superseded
**Date:** YYYY-MM-DD

### Context

### Decision

### Why

### Consequences

### Revisit when
```
