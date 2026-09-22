# Testing & Agent Evals

## 1. 测试目标

StudyOS 有两类风险：

1. 传统软件错误；
2. Agent 行为漂移。

所以：

```text
Unit / Integration / E2E
+
Agent Eval
```

缺一不可。

## 2. Test pyramid

### Layer A — Pure unit tests

优先测试：

- mastery calculation；
- review interval；
- review priority；
- error mapping；
- ranking algorithms（未来）。

要求：

- 无数据库；
- 无网络；
- 无 LLM；
- 快；
- deterministic。

### Layer B — Service integration tests

重点：

`recordCurrentAttempt()`

至少验证：

```text
Question exists
→ Attempt
→ LearningEvent
→ LearningState
→ Mistake?
→ close due Review?
→ create next Review
```

必须测试 transaction。

### Layer C — API contract tests

验证：

- Zod parsing；
- status code；
- stable error shape；
- auth ownership（未来）。

### Layer D — Browser E2E

关键路径：

```text
Dashboard
→ Review
→ StudySession
→ Question
→ Answer
→ updated Knowledge
```

早期只需要少量关键路径。

## 3. 当前测试状态

当前已有：

- Learning Engine unit tests。

当前缺失：

- DB integration test；
- API test；
- UI test；
- E2E；
- Agent eval。

## 4. Agent eval 不是 unit test

Agent eval 关注：

> “模型采取的行为是否符合产品 policy？”

不要求每个字完全相同。

## 5. Agent Eval Dataset

至少建立 50 个 cases。

建议格式：

```ts
{
  name: "weak prerequisite is repaired first",
  learnerState: {...},
  userMessage: "...",
  expected: {
    mustCall: ["search_concepts", "get_learning_state", "get_prerequisites"],
    mustNotCall: ["record_attempt"],
    behaviorTags: ["repair_prerequisite"]
  }
}
```

## 6. Eval categories

### Concept resolution

Case：

> “讲讲支出函数。”

Expected：

- search concept；
- 不猜 ID。

### Low mastery

Expected：

- explanation / basic diagnostic；
- 不直接跳高难度题。

### Strong mastery

Expected：

- 减少基础解释；
- 更高难度应用。

### Weak prerequisite

Expected：

- 查 prerequisite；
- 合理时先修复。

### Persist before evidence

Expected：

- 如果题目将影响 mastery：
  `create_question` 必须先于 `record_attempt`。

### No active question

Expected：

- 不凭空记录 Attempt。

### Hint independence

如果本轮已经给出关键提示：

- independence 不应接近 1。

### Misconception extraction

输入包含典型概念混淆时：

- errorType 正确；
- misconception 具体。

### Review selection

“今天学什么？”

Expected：

- get_due_reviews；
- 不凭 prompt 想象历史。

## 7. Agent regression metrics

未来记录：

- correct tool selection rate；
- forbidden tool-call rate；
- prerequisite repair precision；
- concept resolution accuracy；
- error classification accuracy；
- false mistake creation rate；
- average turns；
- latency；
- token usage。

## 8. Golden rules

Agent eval 不应该：

- 固定模型必须生成一模一样的句子；
- 过度测试文风；
- 把不稳定自然语言当 exact snapshot。

Agent eval 应该：

- 测 tool behavior；
- 测 policy；
- 测 state transition；
- 测 safety boundary。

## 9. CI evolution

### Current

```text
install
→ prisma generate
→ typecheck
→ unit tests
```

### Phase 0 target

```text
npm ci
→ prisma generate
→ typecheck
→ unit
→ build
→ DB integration
```

### Phase 2 target

增加：

```text
agent eval
```

Agent eval 可以先允许手动 / nightly，等成本可控后再进入每次 PR。

## 10. Bug reproduction

如果发现 Agent 错误，不要只改 prompt。

应该：

1. 把真实案例匿名化；
2. 加入 eval dataset；
3. 确认旧版失败；
4. 修改 prompt / tool / service；
5. 确认新版本通过；
6. 检查其他 eval 是否退化。

这会逐渐形成 StudyOS 最重要的 Agent 工程资产。
