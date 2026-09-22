# StudyOS Architecture

## 1. 当前架构

StudyOS 当前是一个单体 TypeScript 应用：

```text
┌──────────────────────────────────┐
│ Browser                          │
│ Next.js pages                    │
└───────────────┬──────────────────┘
                │ HTTP / JSON
                ▼
┌──────────────────────────────────┐
│ Hono API                         │
│ /api/*                           │
└───────────────┬──────────────────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
┌──────────────┐   ┌───────────────┐
│ Services     │   │ Study Agent   │
│              │   │ @openai/agents│
└──────┬───────┘   └──────┬────────┘
       │                  │ tools
       │            ┌─────▼─────────┐
       │            │ Agent Tools   │
       │            └─────┬─────────┘
       │                  │
       └──────────┬───────┘
                  ▼
           ┌──────────────┐
           │ Services     │
           └──────┬───────┘
                  ▼
           ┌──────────────┐
           │ Prisma       │
           └──────┬───────┘
                  ▼
           ┌──────────────┐
           │ MySQL        │
           └──────────────┘
```

## 2. 依赖方向

允许：

```text
UI
→ API
→ Service
→ Prisma

Agent
→ Tool
→ Service
→ Prisma
```

不允许：

```text
UI → Prisma

Agent → Prisma

Tool → raw SQL

Route → 复制业务逻辑

Learning Engine → OpenAI API
```

## 3. 代码目录

```text
src/
├── app/
│   ├── api/[[...route]]/route.ts
│   ├── knowledge/
│   ├── reviews/
│   └── study/
│
├── components/
│
├── lib/
│   └── api.ts
│
└── server/
    ├── agent/
    │   ├── study-agent.ts
    │   └── tools.ts
    │
    ├── learning/
    │   ├── engine.ts
    │   └── engine.test.ts
    │
    ├── services/
    │   ├── learning-service.ts
    │   └── study-service.ts
    │
    ├── app.ts
    └── db.ts
```

## 4. 层职责

### UI

负责：

- 展示；
- 用户输入；
- 页面状态；
- 调 API。

不负责：

- mastery calculation；
- review scheduling；
- Agent policy；
- 数据库逻辑。

### Hono API

负责：

- HTTP contract；
- input validation；
- auth context（未来）；
- 调 service / agent runner；
- 错误映射。

避免：

> 在 route 中堆业务逻辑。

### Services

是主要业务边界。

负责：

- transaction；
- ownership checks；
- data invariants；
- LearningEvent 写入；
- LearningState 更新；
- ReviewTask 生命周期。

### Learning Engine

应该尽量保持 pure / deterministic。

输入：

```text
previous state
+ structured evidence
```

输出：

```text
new state / schedule parameters
```

它不应该依赖：

- database；
- HTTP；
- OpenAI；
- browser。

### Agent

负责：

- 理解用户意图；
- 教学策略；
- 概念定位；
- 题目生成；
- 回答评价；
- tool selection。

Agent 不负责最终业务状态。

### Tools

Tool 是 Agent 可见的能力边界。

Tool 应：

- 参数 schema 明确；
- 权限尽量小；
- 调 Service；
- 返回结构化结果。

Tool 不应：

- 暴露 Prisma；
- 接受任意 SQL；
- 接受任意 shell；
- 允许越权 userId。

## 5. 两种 Memory

### Conversation memory

回答：

> “当前这段对话刚才说了什么？”

当前实现：

- 前端携带最近消息；
- API 传给 Agent；
- 不持久化。

### Learning memory

回答：

> “这个人长期会什么、错过什么、该复习什么？”

当前实现：

- MySQL；
- LearningState；
- LearningEvent；
- Attempt；
- Mistake；
- ReviewTask。

### Rule

Conversation memory 可以丢失而不应破坏长期学习状态。

Learning memory 不能依赖聊天 transcript 才能恢复。

## 6. 核心写入流程

### Practice

```text
Agent creates Question
        ↓
StudySession.currentQuestionId
        ↓
Learner answer
        ↓
Agent structured evaluation
        ↓
record_attempt tool
        ↓
Learning Service transaction
        ├── Attempt
        ├── LearningEvent
        ├── LearningState
        ├── Mistake?
        ├── close due ReviewTask?
        └── new ReviewTask
```

## 7. 数据一致性原则

涉及一次学习行为的多表修改，应尽量在单个 transaction 中完成。

例如禁止：

```text
create Attempt
→ request fails
→ LearningState not updated
```

而应：

```text
transaction {
  Attempt
  Event
  State
  Mistake
  Review
}
```

## 8. 单 Agent 选择

当前坚持单 Agent 的原因：

- Tool 数量仍少；
- Context 可控；
- Domain split 尚未证明必要；
- 多 Agent 会放大调试成本；
- 当前最大问题是学习闭环可靠性，不是 orchestration。

是否拆 Agent 由实际 eval / trace 数据决定。

## 9. 当前技术债

详见 [STATUS.md](./STATUS.md)。

架构相关重点：

- 没有 persistent conversation session backend；
- traceId 尚未落库；
- 没有 authentication context；
- 没有 integration DB test；
- 没有 deployment architecture。

## 10. 未来演进原则

优先演进：

```text
Modular monolith
→ stronger boundaries
→ only then consider new infrastructure
```

不计划因为代码量增加就自动拆 microservice。
