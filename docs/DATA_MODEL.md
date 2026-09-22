# StudyOS Data Model

本文件描述“每张核心表为什么存在”，而不是替代 Prisma schema。

实际字段以：

`prisma/schema.prisma`

为准。

## 1. 总体关系

```text
User
├── LearningState
├── Attempt
├── Mistake
├── ReviewTask
├── StudySession
└── LearningEvent

Subject
└── Topic
    └── Concept
        ├── ConceptRelation
        ├── LearningState
        ├── Question
        │   └── Attempt
        │       └── Mistake
        ├── ReviewTask
        └── LearningEvent
```

## 2. Knowledge structure

### Subject

最高层学科。

例：

- Microeconomics
- Linear Algebra
- English

### Topic

学科中的主题分组。

例：

```text
Microeconomics
└── Uncertainty
```

### Concept

系统学习状态追踪的最小稳定单元。

原则：

> Concept 应是“可以单独判断掌握情况”的知识点，而不是任意文本片段。

错误例：

- Chapter 7
- 今天学习内容

较好例：

- Expected Utility
- Certainty Equivalent
- Matrix Rank

### ConceptRelation

当前关系：

- PREREQUISITE
- RELATED

方向定义：

```text
fromConcept --PREREQUISITE--> toConcept
```

表示：

> fromConcept 是 toConcept 的前置。

## 3. Learning evidence

### Question

表示一个可评估的学习任务。

Question 必须先存在，才允许把回答作为 mastery evidence。

原因：

> 防止 Agent 在没有明确评价对象时随意记录 Attempt。

### Attempt

表示用户对 Question 的一次实际回答。

保存：

- raw answer；
- score；
- result；
- structured evaluation。

Attempt 是事实记录，不应因为后来算法变化被覆盖。

### LearningEvent

表示“这次发生了什么”。

它是未来可重放 / 可审计的证据流。

当前 Event 类型包括：

- CONCEPT_EXPLAINED
- QUESTION_CREATED
- QUESTION_ANSWERED
- HINT_USED
- MISTAKE_CREATED
- REVIEW_SCHEDULED
- REVIEW_COMPLETED
- CONCEPT_RECALLED
- CONCEPT_FORGOTTEN

### Invariant

`LearningEvent` 应尽量 append-only。

不要为了更新当前状态而修改过去事件。

## 4. Learning projection

### LearningState

表示当前系统对：

```text
User × Concept
```

的状态估计。

当前包含：

- mastery；
- confidence；
- attemptCount；
- correctCount；
- lastStudiedAt；
- lastReviewedAt；
- nextReviewAt。

### Important

LearningState 不是原始证据。

它是：

```text
Learning Events / Attempts
        ↓ algorithm
Learning State
```

未来必须能够逐步向“可重建 projection”演进。

## 5. Mistake

Mistake 用于表示：

> 一次 Attempt 中发现的可复用错误信息。

当前稳定 ErrorType：

- NONE
- CONCEPTUAL
- CALCULATION
- REASONING
- MEMORY
- CONDITION
- MISREAD
- CARELESS
- UNKNOWN

Mistake 与 Attempt 分开，是因为：

- Attempt 是一次作答事实；
- Mistake 是对错误模式的解释；
- 一个 Attempt 未来可能产生更丰富的诊断。

当前 schema 为 Attempt → Mistake[]，应保留扩展空间。

## 6. ReviewTask

ReviewTask 是计划任务，不是学习证据本身。

核心字段：

- scheduledAt；
- completedAt；
- intervalDays；
- priority；
- status；
- source。

Source：

- MISTAKE
- LOW_MASTERY
- SCHEDULED_REVIEW
- MANUAL

### Current behavior

当某 concept 存在已经到期的 PENDING ReviewTask，并完成一次对应 practice：

- 旧 due tasks 标记 COMPLETED；
- 写 REVIEW_COMPLETED event；
- 根据新状态创建下一次 ReviewTask。

## 7. StudySession

StudySession 代表一次有明确开始 / 结束边界的学习过程。

当前用途：

- goal；
- mode；
- active question；
- summary；
- learning events grouping。

### currentQuestionId

这是 V0.1 一个重要的状态约束：

> 同一个 session 同时只追踪一个会影响 mastery 的 active question。

它用于跨 HTTP request 知道：

> 当前用户的回答究竟在回答哪道题？

未来如果支持复杂 quiz batch，需要重新设计，而不是直接绕开它。

## 8. 数据不变量

开发中应保护：

### Unique state

每个：

```text
(userId, conceptId)
```

最多一个 LearningState。

### Attempt requires Question

任何会影响 mastery 的回答必须绑定 Question。

### Mastery via Learning Service

禁止：

- page 直接 update mastery；
- API route 手写 mastery；
- Agent Tool 接受 `newMastery` 参数。

### User isolation

未来加入 auth 后，所有 User-scoped entity 都必须经过 user ownership 验证。

### Transactional evidence update

一次 Attempt 引发的：

- event；
- state；
- mistake；
- review

必须作为一个业务 transaction 处理。

## 9. Schema 修改 checklist

新增 / 修改 schema 时：

1. 修改 `prisma/schema.prisma`
2. 创建 migration
3. 检查 seed
4. 检查 service transaction
5. 补 integration test
6. 更新本文件
7. 更新 STATUS（若功能状态改变）

## 10. 尚未建模

当前明确未建模：

- persistent conversation messages；
- StudyGoal；
- Exam / Deadline；
- Source / Document；
- Note；
- mastery algorithm version；
- evaluation correction；
- user preference；
- audit record；
- deployment / billing。

这些不是遗漏；优先级见 [ROADMAP.md](./ROADMAP.md)。
