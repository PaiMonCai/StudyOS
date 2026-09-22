# StudyOS Vision

## 1. 一句话定义

**StudyOS 是一个持续维护 Learner Model 的个人学习操作系统，而不是一个带聊天界面的 AI Tutor。**

它的长期价值来自：

```text
过去的学习证据
      ↓
对当前学习状态的判断
      ↓
更好的下一步学习决策
```

## 2. 核心问题

普通聊天模型擅长回答：

> “这个知识点怎么解释？”

StudyOS 想进一步回答：

> “基于我过去的学习证据，我现在最应该学什么、为什么、应该用什么方式学？”

因此系统必须长期回答四个问题：

1. **Knowledge**：应该学什么？
2. **Evidence**：过去发生了什么？
3. **State**：现在掌握到什么程度？
4. **Action**：下一步最值得做什么？

## 3. 核心资产：Learner Model

StudyOS 最重要的资产不是聊天历史，而是可解释的学习者模型：

```text
Learner Model
├── Knowledge State
├── Learning Events
├── Attempts
├── Mistakes
├── Review History
└── Study Sessions
```

随着真实使用增加，StudyOS 应该越来越能识别：

- 哪些概念已经稳定掌握；
- 哪些知识只是短期答对；
- 哪些前置概念造成后续理解障碍；
- 哪些错误模式重复出现；
- 什么难度、解释方式和题型对当前学习者更有效；
- 什么内容已经需要复习。

## 4. 产品北极星

长期判断产品是否有价值，不看：

- 聊天次数；
- Token 数；
- 页面数量；
- Agent 数量。

而看：

> **StudyOS 是否因为掌握了过去的学习证据，而让“下一次学习决策”比无记忆的聊天助手更好。**

## 5. 长期产品形态

最终可能形成：

```text
                         Learner
                            │
                            ▼
                    Study Orchestrator
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
           Tutor         Planner       Analyst
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                      Learner Model
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         Knowledge       Evidence       Reviews
           Graph          Store         Engine
```

但这只是方向，不是 V0.x 的实现要求。

## 6. 不变原则

### 6.1 Evidence before opinion

学习状态必须尽量来源于结构化证据，而不是模型的主观印象。

### 6.2 AI interprets; code governs state

LLM 可以：

- 理解回答；
- 发现误区；
- 判断错误类型；
- 生成题目；
- 选择教学策略。

LLM 不应该直接：

- 设置 mastery；
- 修改复习时间；
- 绕过权限；
- 任意修改历史记录。

### 6.3 Explainability over false precision

`mastery = 0.67` 只是系统内部估计，不是客观真值。

系统应尽量能解释：

> “为什么这个值发生变化？”

### 6.4 Single-user value before platform scale

早期目标是做出一个个人每天愿意使用的系统，而不是提前做：

- 班级；
- 教师端；
- 多租户；
- 商业订阅；
- 社交；
- 复杂 RBAC。

### 6.5 Deterministic systems where possible

能用透明业务规则稳定完成的事情，不要交给模型随机决定。

### 6.6 Complexity must be earned

以下技术只有出现明确问题后才引入：

- Redis；
- 消息队列；
- Vector DB；
- Neo4j；
- 多 Agent；
- Event bus；
- Microservices。

## 7. 目标用户

V0.x 的 Primary User：

> 一个同时学习多个学科、会持续做题和复习、希望 AI 能逐渐理解自己薄弱点的个人学习者。

优先支持：

- 大学 / 考研类系统学习；
- 数学、经济学等结构化知识；
- 英语等需要长期训练和反馈的能力型学习。

## 8. 非目标

StudyOS 不试图成为：

- 通用知识搜索引擎；
- 在线教育平台；
- 教师 LMS；
- 单纯的 Anki 克隆；
- 一个无所不能的 Agent 平台；
- 所有文件的个人知识库。

未来某些能力可能接入，但都必须服务于 Learner Model 和学习闭环。

## 9. 成功信号

早期成功信号：

- 用户愿意持续记录真实学习；
- Agent 在关键场景会读取历史状态，而不是总是从零回答；
- Review 会影响后续 mastery；
- 重复误区能够被系统识别；
- 系统给出的下一步建议有明确数据依据；
- 用户可以纠正错误诊断，系统能够保留更可靠的证据。

## 10. 长期约束

无论系统未来多复杂，都应保持：

```text
Evidence
  ↓
State
  ↓
Decision
  ↓
Action
  ↓
New Evidence
```

这是 StudyOS 的核心循环。
