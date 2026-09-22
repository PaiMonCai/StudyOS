# StudyOS Roadmap

本 Roadmap 不是愿望清单，而是 **开发顺序约束**。

原则：

> 前一阶段没有达到 Exit Criteria，不因为“更酷”就提前进入下一阶段。

---

## Phase 0 — Repository Stabilization

### 目标

让仓库具备可重复开发、可验证修改的基本条件。

### Must

- [ ] 提交 `package-lock.json`
- [ ] 创建并提交 initial Prisma migration
- [ ] CI 增加 `npm run build`
- [ ] 建立最小 MySQL integration test
- [ ] 为 API / Tool error contract 统一格式
- [ ] 给关键 service transaction 补测试
- [ ] 明确环境变量校验
- [ ] 补充基础日志规范

### Exit Criteria

```text
fresh clone
→ npm install / npm ci
→ db migrate
→ seed
→ typecheck
→ test
→ build
→ run
```

在干净环境可以稳定完成。

---

## Phase 1 — V0.1 Closed Learning Loop

### 目标

不是“Agent 能聊天”，而是一个完整学习行为可以可靠产生下一次学习所需的数据。

### User flow

```text
Choose concept
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

### Must

- [ ] Review task 能直接进入对应 concept 的 StudySession
- [ ] Study 页面显示当前 concept context
- [ ] Session 有明确 End action
- [ ] Session summary 可查看
- [ ] Concept detail page
- [ ] Attempt history
- [ ] Mistake list + detail
- [ ] Mastery change explanation
- [ ] Review completion UX
- [ ] 用户可纠正错误 evaluation / mistake diagnosis
- [ ] 至少 30 个核心 integration tests

### Exit Criteria

连续实际使用至少一段时间后：

- 学习状态能跨 Session 延续；
- Review 会形成下一次学习；
- 明显错误不会静默污染 mastery；
- 用户能理解“为什么系统认为我薄弱”。

---

## Phase 2 — Agent Reliability & Evals

### 目标

从“prompt 看起来合理”进入“Agent 行为可以被回归测试”。

### Eval categories

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

- [ ] 50+ deterministic scenario fixtures
- [ ] eval runner
- [ ] expected tool-call rules
- [ ] regression baseline
- [ ] failure-case dataset
- [ ] prompt change must run eval
- [ ] traceId 与 StudySession 关联
- [ ] latency / token / tool-call metrics

### Exit Criteria

Agent prompt、model 或 tool contract 改动后，可以回答：

> “相比上一版，哪些行为变好了，哪些变差了？”

---

## Phase 3 — Learner Model V0.2

### 目标

提高 Learner Model 的可信度，而不是增加更多 UI。

### Topics

- mastery calibration
- confidence model
- evidence weighting
- review priority
- repeated mistake patterns
- concept dependency effects
- recency / forgetting
- question difficulty normalization

### Must

- [ ] LearningState 可以从 LearningEvent 重建
- [ ] mastery algorithm versioning
- [ ] state update audit trail
- [ ] mistake-pattern aggregation
- [ ] review outcome analytics
- [ ] 用户纠正 Agent evaluation 后可重新投影 state

### Important

在有真实数据前，不要做复杂 ML 模型。

先验证简单算法的错误在哪里。

---

## Phase 4 — Planning

### 目标

让 StudyOS 能回答：

> 今天有限时间内，我应该先学什么？

### Inputs

- due reviews
- weak concepts
- prerequisites
- current goals
- target exam / deadline
- available time
- recent workload

### Outputs

- daily study plan
- session goals
- review/new-content split
- rationale

### Must

- [ ] Goal model
- [ ] deadline model
- [ ] time budget
- [ ] deterministic ranking baseline
- [ ] Planner recommendation explanation
- [ ] manual override

### Rule

Planner 先做成 service + ranking algorithm。

不要第一天就增加 Planner Agent。

---

## Phase 5 — Sources / Notes / RAG

### 进入条件

只有当实际使用明确出现：

> Agent 缺少教材、笔记或题目来源，导致教学质量受限。

才进入此阶段。

### Scope

- [ ] Source model
- [ ] note / textbook references
- [ ] PDF ingestion
- [ ] chunking
- [ ] concept-source mapping
- [ ] retrieval
- [ ] citation in teaching answers

### Later, if needed

- embeddings
- vector DB
- hybrid retrieval

### Non-goal

RAG 不参与 mastery 的直接计算。

---

## Phase 6 — Knowledge Graph Assistance

### 目标

降低手工维护 Concept 和 prerequisites 的成本。

### Flow

```text
Source
→ AI proposes concepts
→ AI proposes relations
→ validation
→ human review
→ persist
```

### Rule

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

在此之前，禁止把当前 single-user dev mode 当 production auth。

---

## Phase 8 — Specialized Agents / V1.0

### 进入条件

必须出现真实证据证明一个 Study Agent 已经产生：

- prompt conflicts；
- context overload；
- domain-specific evaluation conflicts；
- tool routing complexity。

### Possible shape

```text
Study Manager
├── Economics Tutor
├── Math Tutor
└── English Tutor
```

### Orchestration rule

- specialist 应接管对话 → handoff
- manager 应继续掌控 → agent-as-tool

### 禁止

为了“Agent 架构看起来高级”而拆 Agent。

---

# Priority rule

任何新需求先问：

1. 它属于哪个 Phase？
2. 当前 Phase 的 Exit Criteria 满足了吗？
3. 它是否改善核心闭环？
4. 它是否引入了尚未证明必要的复杂度？

如果回答不清楚，默认 **不做**。
