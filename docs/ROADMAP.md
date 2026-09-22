# StudyOS Roadmap

本 Roadmap 是 **开发顺序约束**，不是愿望清单。

> 前一阶段没有达到 Exit Criteria，不因为“更酷”就提前进入下一阶段。

---

## Phase 0 — Repository Stabilization ✅

### 目标

让仓库具备可重复开发、可验证修改的基本条件。

### Must

- [x] 提交 `package-lock.json`
- [x] 创建并提交 initial Prisma migration
- [x] CI 增加 `npm run build`
- [x] 建立真实 MySQL integration test
- [x] 统一 API error contract
- [x] 统一 Agent Tool result contract
- [x] 给关键 learning transaction 补 integration test
- [x] 明确环境变量校验
- [x] 补充基础 structured logging
- [x] CI 验证 seed
- [x] CI 验证 production server startup + health

### Exit Criteria

以下流程已由 GitHub Actions 验证：

```text
fresh checkout
→ npm ci
→ db migrate deploy
→ seed
→ typecheck
→ unit tests
→ MySQL integration tests
→ production build
→ production start
→ health smoke
```

**Status: CLOSED**

---

## Phase 1 — V0.1 Closed Learning Loop ← CURRENT

### 目标

不是“Agent 能聊天”，而是一个完整学习行为能够可靠地产生下一次学习所需的数据，并且用户能看懂、进入、结束这个过程。

### User flow

```text
Choose / due concept
→ start session
→ inspect state
→ explain / diagnose
→ persisted question
→ answer
→ evaluation
→ attempt
→ learning event
→ mastery
→ mistake if needed
→ review task
→ next review
```

### Session / Review

- [x] Review task 能直接进入对应 concept 的 StudySession
- [x] Study 页面显示并恢复当前 concept / review context
- [x] 同一 ReviewTask 重复点击复用 open Session
- [x] Session 有明确 End action
- [x] Session summary 可查看
- [x] Session history detail
- [x] Review 完成后的即时 outcome feedback
- [x] Review history / next review 展示

### Concept / Evidence

- [x] Concept detail page
- [x] Prerequisite view
- [x] Attempt history
- [x] Mistake list + detail
- [x] Mastery change explanation
- [x] LearningEvent timeline

### Learner correction

- [x] 用户可纠正错误 evaluation
- [x] 用户可纠正 mistake diagnosis
- [x] correction 后安全重新投影 LearningState

### Tests

- [x] Learning transaction MySQL integration test
- [x] Review-session binding / idempotency integration test
- [ ] 至少 30 个核心 service/API integration cases
- [ ] 关键 browser E2E

### Exit Criteria

连续实际使用后至少满足：

- 学习状态跨 Session 延续；
- due Review 能进入正确 Concept；
- Review practice 会生成下一次 Review；
- 明显错误不会静默污染 mastery；
- 用户能理解“为什么系统认为我薄弱”；
- 用户可以纠正系统判断；
- 关键闭环有足够 integration/E2E 回归保护。

---

## Phase 2 — Agent Reliability & Evals

### 目标

从“prompt 看起来合理”进入“Agent 行为可以被回归测试”。

### Eval categories

- session-context use
- concept resolution
- low mastery behavior
- high mastery behavior
- prerequisite repair
- current-question ownership
- no-active-question protection
- error classification
- hint / independence handling
- repeated misconception recognition
- due review selection

### Must

- [ ] 50+ scenario fixtures
- [ ] eval runner
- [ ] expected tool-call rules
- [ ] regression baseline
- [ ] failure-case dataset
- [ ] prompt/model/tool change runs eval
- [ ] traceId 与 StudySession 关联
- [ ] latency / token / tool-call metrics

### Exit Criteria

Agent prompt、model 或 tool contract 改动后，可以回答：

> “相比上一版，哪些行为变好了，哪些变差了？”

---

## Phase 3 — Learner Model V0.2

### 目标

提高 Learner Model 的可信度，而不是增加更多 UI。

### Must

- [ ] LearningState 可以从 LearningEvent 重建
- [ ] mastery algorithm versioning
- [ ] state update audit trail
- [ ] confidence calibration
- [ ] evidence weighting
- [ ] mistake-pattern aggregation
- [ ] review outcome analytics
- [ ] recency / forgetting model
- [ ] question difficulty normalization

### Rule

在有真实数据前，不做复杂 ML 模型。

先用简单算法找出真实错误。

---

## Phase 4 — Planning

### 目标

回答：

> 今天有限时间内，我应该先学什么？

### Inputs

- due reviews
- weak concepts
- prerequisites
- goals
- exam / deadline
- available time
- recent workload

### Must

- [ ] Goal model
- [ ] deadline model
- [ ] time budget
- [ ] deterministic ranking baseline
- [ ] recommendation explanation
- [ ] manual override

### Rule

Planner 先做成 Service + deterministic ranking。

不要一开始增加 Planner Agent。

---

## Phase 5 — Sources / Notes / RAG

### 进入条件

真实使用明确出现：

> Agent 缺少教材、笔记或题目来源，导致教学质量受限。

### Scope

- [ ] Source model
- [ ] note / textbook references
- [ ] PDF ingestion
- [ ] chunking
- [ ] concept-source mapping
- [ ] retrieval
- [ ] citation in teaching answers

Later only if necessary:

- embeddings
- vector DB
- hybrid retrieval

### Non-goal

RAG 不参与 mastery 的直接计算。

---

## Phase 6 — Knowledge Graph Assistance

### Flow

```text
Source
→ AI proposes concepts
→ AI proposes relations
→ validation
→ human review
→ persist
```

AI 可以 proposal，不可静默修改正式知识图谱。

---

## Phase 7 — Authentication & Multi-device

### 进入条件

需要公网长期使用或多设备同步。

### Must

- authentication
- authorization
- user isolation
- session security
- rate limit
- secrets policy
- account export/delete
- backup/recovery
- dependency-security triage

当前 `DEFAULT_USER` 模式不得作为 production auth。

---

## Phase 8 — Specialized Agents / V1.0

### 进入条件

必须有 trace / eval 证据证明单 Study Agent 已产生：

- prompt conflicts
- context overload
- domain-specific evaluator conflicts
- tool routing complexity

### Possible shape

```text
Study Manager
├── Economics Tutor
├── Math Tutor
└── English Tutor
```

- specialist 接管对话 → handoff
- manager 保持控制 → agent-as-tool

禁止为了“架构高级”而拆 Agent。

---

# Priority rule

任何新需求先问：

1. 它属于哪个 Phase？
2. 当前 Phase 的 Exit Criteria 满足了吗？
3. 它是否改善核心学习闭环？
4. 它是否引入尚未证明必要的复杂度？

回答不清楚，默认 **不做**。
