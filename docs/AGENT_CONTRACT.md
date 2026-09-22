# Study Agent Contract

本文件定义 Agent 层的长期边界。

> Prompt 可以改变，但 Contract 不能被 prompt 随意绕过。

## 1. Agent 的职责

Study Agent 负责：

- 理解学习意图；
- 识别相关 concept；
- 查询 learner state；
- 检查 prerequisites；
- 查询 recent mistakes；
- 选择解释 / 诊断 / 练习；
- 生成合适难度问题；
- 对用户回答生成 structured evaluation；
- 调用受限 Tool 记录学习证据；
- 给出下一步教学反馈。

## 2. Agent 不负责

Agent 不拥有：

- mastery algorithm；
- review interval algorithm；
- authorization；
- database transactions；
- data deletion；
- raw SQL；
- shell；
- schema migration。

这些必须留在确定性业务层。

## 3. 当前 Tool Registry

### Read tools

#### get_session_context

读取当前 StudySession 的结构化上下文：

- goal；
- mode；
- bound concept；
- bound ReviewTask；
- subject / topic。

以下情况优先使用：

- 用户只说“开始 / 继续 / 开始复习”，没有重新点名知识点；
- 当前 Session 可能由 Reviews 页面创建；
- Agent 需要确认这次会话的默认学习目标。

如果 Session 已绑定 Review concept，除非用户明确切换主题，否则该 concept 应作为默认目标。

#### search_concepts

用途：

> 把自然语言概念名解析成正式 concept ID。

必须在：

- 只有名字、没有 ID；
- 名称存在歧义；

时优先使用。

#### get_learning_state

读取：

- mastery；
- confidence；
- attempts；
- recent state。

#### get_prerequisites

检查：

> 当前困难是否来自前置知识。

#### get_recent_mistakes

检查：

- unresolved mistakes；
- repeated misconception clues。

#### get_due_reviews

用于：

> “今天该学什么 / 复习什么？”

### Safe write tools

#### create_question

任何准备作为 mastery evidence 的题目：

> **必须先 create_question。**

禁止先问完题，再凭回忆补建 Question。

#### record_attempt

输入 structured evidence：

- answer；
- correctness；
- reasoning；
- independence；
- errorType；
- misconceptions；
- feedback。

禁止参数：

- mastery；
- nextReviewAt；
- review interval。

#### finish_study_session

结束 session 并保存 summary。

## 4. Tool invariant

```text
Agent
  ↓
Tool
  ↓
Service
  ↓
Database
```

禁止：

```text
Agent
  ↓
Prisma
```

### Tool result contract

所有 Study Agent tools 统一返回：

```ts
{ ok: true, data: ... }
```

或：

```ts
{
  ok: false,
  error: {
    code: string,
    message: string,
    retryable: boolean
  }
}
```

目的：

- 不把数据库异常或内部 stack 直接暴露给模型；
- 区分“查询结果为空”和“工具执行失败”；
- Agent 不能把失败操作误认为已经持久化；
- retry 行为由明确的 `retryable` 信号约束。

Agent 只有在 `ok: true` 时，才能声称 create / record / finish 等写操作成功。

## 5. 当前教学决策原则

### Low mastery

倾向：

- 基础解释；
- 示例；
- 低难度诊断；
- 前置检查。

### Medium mastery

倾向：

- 对比；
- 推导；
- targeted practice；
- misconception repair。

### High mastery

倾向：

- transfer；
- application；
- harder diagnostic；
- concise explanation。

这些是教学 policy，不是 rigid rules。

## 6. Prerequisite policy

如果：

```text
target mastery low
AND
important prerequisite clearly weaker
```

Agent 应考虑先修复 prerequisite。

但不要机械地无限向前追溯。

未来需要 eval 来确定阈值与行为稳定性。

## 7. Answer evaluation schema

Agent 当前输出到 `record_attempt`：

### correctness

范围 0..1。

衡量：

- 结论；
- 计算；
-事实正确性。

### reasoning

范围 0..1。

衡量：

- 推导完整度；
- 因果逻辑；
- 概念连接。

### independence

范围 0..1。

衡量：

> 用户是在多少帮助下完成。

例如：

- 无提示独立完成 → 高；
- Agent 已几乎给出答案 → 低。

### errorType

固定 enum：

- NONE
- CONCEPTUAL
- CALCULATION
- REASONING
- MEMORY
- CONDITION
- MISREAD
- CARELESS
- UNKNOWN

### misconceptions

应尽量：

- 短；
- 具体；
- 可复用。

差：

> “理解不够。”

好：

> “把 E[u(X)] 与 u(E[X)] 当作同一个量。”

## 8. Agent Safety / Capability

当前禁止给 Study Agent：

- raw database tool；
- SQL tool；
- shell tool；
- file deletion；
- arbitrary HTTP requests；
- arbitrary userId；
- bulk mutation。

未来新增 Tool 需要回答：

1. 为什么 Agent 必须拥有它？
2. 能否改成 read-only？
3. 能否缩小参数范围？
4. 是否能放在 Service 中验证？
5. 失败会不会污染 Learner Model？

## 9. Context strategy

当前短期上下文：

```text
last messages from browser
→ prompt
```

长期学习状态：

```text
tools
→ MySQL
```

不要把长期关键状态只写在 system prompt / chat history 中。

## 10. Prompt change policy

修改 `study-agent.ts` instruction 时：

- 不应该改变 data invariant；
- 不应该新增隐形业务规则；
- 应更新 / 运行 agent eval；
- 如果改变 Tool 使用规则，更新本文档。

## 11. Future multi-agent gate

只有出现可观测问题时拆：

- Economics / Math prompt 冲突；
- evaluator rubric 明显不同；
- context 过长；
- tool registry 难以控制；
- trace 证明 routing 复杂。

在此之前：

> One good agent + narrow tools > many agents.
