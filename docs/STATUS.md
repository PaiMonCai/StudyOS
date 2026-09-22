# StudyOS Current Status

> Snapshot date: **2026-09-22**  
> Verified through CI run: **35713621345** on `main@e22ccb039b7129bbe3f03d613cd29b9c41f7677f`

本文件只描述“当前真实状态”。未来计划请看 [ROADMAP.md](./ROADMAP.md)。

## 1. 总体阶段

**阶段：Phase 1 — V0.1 Closed Learning Loop / Early Development**

Phase 0 Repository Stabilization 已达到退出条件：

```text
fresh checkout
→ npm ci
→ migrate deploy
→ seed
→ typecheck
→ unit tests
→ real MySQL integration tests
→ production build
→ production server start
→ /api/health smoke test
```

以上链路已由 GitHub Actions 完整验证。

当前仍不是 production-ready 产品。

| 领域 | 状态 |
| --- | --- |
| Repository reproducibility | ✅ |
| Versioned Prisma migrations | ✅ |
| CI production verification | ✅ |
| Deterministic Learning Engine | ✅ 基础完成 |
| MySQL service integration tests | 🟡 已建立，覆盖仍少 |
| Study Agent | 🟡 可运行骨架 |
| Agent Tool contract | ✅ 基础边界建立 |
| Dashboard | 🟡 Skeleton |
| Knowledge | 🟡 Concept detail + evidence view implemented |
| Reviews | ✅ Due/Upcoming/Completed + completion outcome |
| Study Session context | ✅ 可恢复结构化 context |
| Session End / Summary UX | ✅ End/Summary/History 基础闭环 |
| Mistake UX | ✅ list/detail/resolve/reopen/correction 基础闭环 |
| Concept Detail | ✅ 基础完成 |
| Persistent conversation transcript | ❌ |
| Agent eval suite | ❌ |
| Authentication | ❌ 有意延期 |
| Deployment | ❌ 未设计 |
| Sources / PDF / RAG | ❌ 有意延期 |
| Multi-agent | ❌ 有意延期 |

图例：

- ✅ Done：当前阶段对应能力已有明确、测试过的基础闭环。
- 🟡 Partial：实现存在，但测试、产品体验或覆盖仍不完整。
- ❌ Not implemented：尚未实现。

## 2. 当前工程基础

### 2.1 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Hono
- OpenAI Agents SDK
- Zod 4
- Prisma ORM 7
- MySQL 8
- Vitest

### 2.2 可重复性

仓库当前已提交：

- `package-lock.json`
- `prisma/migrations/20260922_initial/migration.sql`
- `prisma/migrations/20260922_review_session_context/migration.sql`
- `prisma/migrations/20260922_learner_corrections/migration.sql`
- `prisma/migrations/migration_lock.toml`

CI 使用：

```bash
npm ci
npm run db:deploy
```

不再依赖 CI 临时生成 schema。

### 2.3 环境变量

`src/server/env.ts` 使用 Zod 解析服务端环境。

当前校验：

- DB runtime connection
- OpenAI model / optional API key
- default single-user identity
- log level
- NODE_ENV

### 2.4 Logging / errors

已建立：

- requestId
- `x-request-id` response header
- JSON structured server logs
- stable API error body：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "...",
    "requestId": "..."
  }
}
```

Agent Tool 统一返回：

```text
{ ok: true, data }
or
{ ok: false, error }
```

## 3. Learner Model

### 3.1 当前数据模型

- User
- Subject
- Topic
- Concept
- ConceptRelation
- LearningState
- Question
- StudySession
- Attempt
- Mistake
- ReviewTask
- LearningEvent

核心原则：

```text
LearningEvent = evidence history
LearningState = current projection
```

### 3.2 Learning Engine

当前：

```text
performance =
  0.50 * correctness
+ 0.30 * reasoning
+ 0.20 * independence
```

```text
new mastery =
0.75 * old mastery
+ 0.25 * performance
```

Review interval baseline：

- 1 day
- 3 days
- 7 days
- 14 days
- 30 days

LLM 不直接设置 mastery / review date。

## 4. Study Agent

当前仍为 **单 Agent**。

已有 10 个 tools：

1. `get_session_context`
2. `search_concepts`
3. `get_learning_state`
4. `get_prerequisites`
5. `get_recent_mistakes`
6. `get_due_reviews`
7. `create_question`
8. `get_current_question`
9. `record_attempt`
10. `finish_study_session`

边界：

- Tool → Service → Prisma
- no raw Prisma / SQL / shell
- no direct mastery mutation
- graded question 必须先持久化
- Tool failure 与 empty data 明确区分

## 5. Phase 1 当前已经推进的闭环

### Review → StudySession

现在：

```text
Reviews page
  ↓
POST /api/reviews/:id/start
  ↓
validate due PENDING ReviewTask
  ↓
create/reuse REVIEW StudySession
  ├── subjectId
  ├── topicId
  ├── conceptId
  └── reviewTaskId
  ↓
/study?sessionId=...
  ↓
GET /api/sessions/:id
  ↓
restore session context
```

重要行为：

- 同一 ReviewTask 的未结束 Session 会复用；
- 刷新 Study 页面后 concept / review context 可以恢复；
- 聊天 transcript 暂时不会恢复；
- 打开 Review Session **不会**完成复习；
- 对该 concept 记录 practice 后才完成旧 due ReviewTask，并生成下一次任务。

## 6. 当前 API

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/knowledge`
- `GET /api/reviews/today`
- `POST /api/reviews/:id/start`
- `POST /api/sessions`
- `GET /api/sessions/:id`
- `POST /api/agent/message`

## 7. 测试与 CI

### Unit

已有 Learning Engine pure tests。

### MySQL integration

当前至少覆盖两个核心 service slice：

1. `recordCurrentAttempt`
   - Attempt
   - LearningEvent
   - LearningState
   - Mistake
   - close old due review
   - create next review
   - clear active question

2. `startReviewSession`
   - bound concept
   - bound review task
   - ownership
   - reuse existing open review session

覆盖数量仍远低于 Phase 1 的 30 个核心 integration cases 目标。

### CI

当前完整链：

- npm ci
- Prisma generate
- migrate deploy
- seed
- TypeScript typecheck
- unit tests
- MySQL integration tests
- Next.js production build
- production server smoke test

## 8. 当前主要缺口

### P1 — Session lifecycle

已完成：

- 明确 End Session UI
- direct finish API
- deterministic summary
- summary view
- finish idempotency
- Session history API / page
- Dashboard recent Session links

### P1 — Review UX

已完成：

- Review → bound Session
- Due / Upcoming / Completed 三种视图
- completed review history
- Session Summary 中显示 Review 是否真正完成
- 显示当前 mastery 与 nextReviewAt
- 未产生可评分作答时明确保持 ReviewTask PENDING

### P1 — Concept UX

已完成：

- Concept detail
- prerequisite / dependent view
- recent attempts
- mistake history（嵌入 Concept Detail）
- mastery history
- state-change explanation
- LearningEvent timeline
- 从 Concept 直接创建 bound StudySession

尚缺：

- 独立 Mistake UX
- 更完整 mastery timeline 可视化

### P1 — Mistake UX

已完成：

- mistake list
- mistake detail
- resolve / reopen
- ownership checks
- resolve/reopen 不修改历史 Attempt / LearningState 的集成测试

尚缺：

- pattern aggregation
- diagnosis correction

### P1 — User correction

已完成基础闭环：

- AttemptCorrection 追加式保存评分纠正
- 原 Attempt score/result/evaluation 保持不可变
- correction 后基于历史 QUESTION_ANSWERED evidence 重投影 LearningState
- 已到期 Review 不会因 correction 被误完成
- 未来 pending Review 会按新 projection 重新安排
- MistakeRevision 保存诊断修订审计
- Mistake diagnosis 修订不改变 mastery
- correction/revision 写入 LearningEvent audit trail

### P1 — Conversation persistence

短期上下文仍由浏览器回传。

因此刷新后：

- Session context 可恢复；
- transcript 不可恢复。

### P1/P2 — Agent reliability

尚无正式 Agent eval dataset。

### Observability

已有：

- requestId
- JSON application logs

尚缺：

- StudySession.traceId 实际关联
- model latency / token usage
- tool-call metrics
- centralized error aggregation

### Dependency security

当前 lockfile 的 CI `npm audit` 输出仍报告若干依赖漏洞，需要在进入公网部署前单独 triage。

不要直接使用 `npm audit fix --force` 破坏锁定依赖；应按依赖来源逐项处理。

## 9. 当前明确延期

暂不优先：

- multi-agent
- Redis / queues
- Vector DB
- Neo4j
- PDF ingestion
- OCR
- web research agent
- teacher dashboard
- payment
- multi-tenant architecture

## 10. 下一步

当前最近的 vertical slice：

> **Session End + Summary**

完成后再优先推进：

> **Concept Detail + Attempt/Mistake history**

唯一权威优先级见 [ROADMAP.md](./ROADMAP.md)。
