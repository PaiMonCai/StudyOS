# StudyOS Current Status

> Snapshot date: **2026-09-22**  
> Verified against: `main@fadc5b4ffe03c0b1eebfad1af18b631703d77070`

本文件只描述“当前真实状态”。未来计划请看 [ROADMAP.md](./ROADMAP.md)。

## 1. 总体阶段

**阶段：V0.1 Foundation / Early Development**

当前已经具备完整项目骨架和部分学习闭环，但还不应视为稳定 MVP，更不是 production-ready。

当前判断：

| 领域 | 状态 |
| --- | --- |
| 项目基础设施 | ✅ 基础完成 |
| 数据模型 | ✅ 基础完成 |
| Deterministic Learning Engine | ✅ 基础完成 |
| Study Agent | 🟡 可运行骨架 |
| Agent Tools | 🟡 可运行骨架 |
| Dashboard | 🟡 Skeleton |
| Knowledge | 🟡 Skeleton |
| Reviews | 🟡 Skeleton |
| Study Session UI | 🟡 Skeleton |
| Mistake UX | ❌ 未完成 |
| Concept Detail | ❌ 未完成 |
| Persistent conversation session | ❌ 未完成 |
| Agent eval suite | ❌ 未完成 |
| Integration / E2E tests | ❌ 未完成 |
| Authentication | ❌ 有意延期 |
| Deployment | ❌ 未设计 |
| Sources / PDF / RAG | ❌ 有意延期 |
| Multi-agent | ❌ 有意延期 |

图例：

- ✅ Done：当前版本已经形成明确闭环。
- 🟡 Partial：代码存在，但产品闭环、测试或 UX 不完整。
- ❌ Not implemented：尚未实现。

## 2. 当前已实现

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

### 2.2 数据层

已存在：

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

当前采用：

```text
LearningEvent = evidence history
LearningState = current projection
```

### 2.3 Learning Engine

已实现：

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

基础 review interval：

- 1 day
- 3 days
- 7 days
- 14 days
- 30 days

已有纯函数单元测试。

### 2.4 Study Agent

当前为 **单 Agent**。

已提供 9 个 tools：

1. `search_concepts`
2. `get_learning_state`
3. `get_prerequisites`
4. `get_recent_mistakes`
5. `get_due_reviews`
6. `create_question`
7. `get_current_question`
8. `record_attempt`
9. `finish_study_session`

当前约束：

- Tool → Service → Prisma。
- Agent 无 raw Prisma / SQL / shell。
- Agent 不直接设置 mastery。
- 会影响 mastery 的题必须先持久化。
- 当前一个 StudySession 只持有一个 `currentQuestionId`。

### 2.5 API

当前接口：

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/knowledge`
- `GET /api/reviews/today`
- `POST /api/sessions`
- `POST /api/agent/message`

### 2.6 UI

当前页面：

- `/` Dashboard
- `/study`
- `/knowledge`
- `/reviews`

它们目前是 MVP skeleton，不代表完整产品体验。

### 2.7 Seed

已有初始微观经济学 / 线性代数知识点，用于测试：

- Expected Utility
- Risk Aversion
- Certainty Equivalent
- Risk Premium
- Jensen's Inequality
- Indirect Utility
- Expenditure Function
- Hicksian Demand
- Slutsky Equation
- Linear Independence
- Column Space
- Matrix Rank
- Linear Systems

## 3. 当前 CI

GitHub Actions 当前检查：

- dependency install
- Prisma client generation
- TypeScript typecheck
- unit tests

最近一次已通过。

但 CI **还没有**：

- `next build`
- integration test
- MySQL service test
- E2E browser test
- agent eval
- migration verification

## 4. 当前已知缺口

### P0 — Repository reproducibility

目前没有：

- committed `package-lock.json`
- versioned initial Prisma migration

风险：

> 不同时间 `npm install` 和本地创建 migration 的结果可能产生漂移。

### P0 — Build verification

CI 没有跑：

```bash
npm run build
```

所以 typecheck 通过 ≠ Next.js production build 一定通过。

### P0 — Agent eval

当前 Agent 行为主要靠 prompt 约束，没有固定 eval cases。

尚未验证：

- 弱前置知识是否稳定触发修复；
- 模糊 concept 是否正确 resolve；
- 无 active question 时是否避免误记 Attempt；
- hint 后 independence 是否稳定降低；
- 相似题多次运行是否得到可接受行为。

### P1 — Conversation persistence

当前：

```text
Browser sends recent history
      ↓
POST /api/agent/message
      ↓
Agent
```

数据库没有真正的 conversation message store，也没有 Agents SDK persistent session backend。

这意味着：

- 页面刷新可能丢失聊天上下文；
- 学习状态不会丢，但短期会话上下文会丢。

### P1 — Review UX

当前 Review 页面能显示 due tasks，但：

- “开始复习”只是跳转到 `/study`；
- 没有把 reviewTask / concept context 自动带入 Session；
- 没有独立 review completion interaction。

后端已具备：同 concept 的 due review 在一次 practice 被记录后自动关闭。

### P1 — Mistake UX

数据库会产生 Mistake，但尚没有：

- 错题列表；
- Mistake detail；
- 错误模式统计；
- resolve / reopen workflow。

### P1 — Concept UX

Knowledge 目前仅显示树状列表。

尚没有：

- Concept detail；
- prerequisite view；
- recent attempts；
- mistake history；
- mastery timeline；
- learning-event explanation。

### P1 — Session lifecycle

已有 `finish_study_session` tool，但 UI 没有明确：

- end session action；
- summary view；
- session history detail。

### P1 — Observability

`StudySession.traceId` 字段已存在，但当前没有把 Agent trace id 写回数据库。

也没有：

- structured application logging；
- request id；
- error aggregation；
- latency / cost metrics。

### P2 — Security

当前为 single-user development mode：

```text
DEFAULT_USER_EMAIL
→ getDefaultUser()
```

没有 authentication / authorization。

因此当前版本只适合：

- 本地；
- 受控开发环境。

不适合直接开放公网给多用户使用。

### P2 — Data governance

目前没有：

- export；
- delete-account flow；
- backup strategy；
- audit tooling；
- retention strategy。

## 5. 当前不应该做的事

在 P0/P1 没稳定前，不应优先投入：

- 多 Agent；
- Vector DB；
- Neo4j；
- Redis；
- PDF ingestion；
- OCR；
- Web research agent；
- teacher dashboard；
- payment；
- multi-tenant architecture。

## 6. 下一步

唯一权威优先级请看：

[ROADMAP.md](./ROADMAP.md)

当前近期目标：

> **先把 V0.1 从“骨架能运行”提升到“学习闭环可靠、可测试、可持续开发”。**
