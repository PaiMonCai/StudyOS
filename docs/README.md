# StudyOS 文档导航

> 这份目录是后续开发的入口。先读这里，再写代码。

StudyOS 仍处于早期开发阶段。当前最重要的不是继续堆功能，而是保持 **产品目标、架构边界、当前状态和开发优先级** 一致。

## 1. 文档职责

| 文档 | 回答的问题 | 更新频率 |
| --- | --- | --- |
| [VISION.md](./VISION.md) | StudyOS 为什么存在？最终想成为什么？ | 低 |
| [PRODUCT.md](./PRODUCT.md) | 当前产品闭环、MVP 与验收标准是什么？ | 中 |
| [STATUS.md](./STATUS.md) | 现在真实做到哪一步？哪些还没做？ | 高 |
| [ROADMAP.md](./ROADMAP.md) | 下一步先做什么？什么暂时不要做？ | 高 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 系统怎样分层？依赖方向是什么？ | 中 |
| [DATA_MODEL.md](./DATA_MODEL.md) | 核心数据代表什么？有哪些不变量？ | 中 |
| [AGENT_CONTRACT.md](./AGENT_CONTRACT.md) | Agent 可以做什么、不可以做什么？ | 中 |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 新功能应该怎样开发、提交和验收？ | 中 |
| [TESTING.md](./TESTING.md) | 什么要测？Agent 怎么做 eval？ | 中 |
| [DECISIONS.md](./DECISIONS.md) | 为什么做出这些关键架构决定？ | 按需 |

## 2. Source of truth

发生冲突时按下面顺序判断：

1. **代码与数据库 schema**：描述“现在实际运行什么”。
2. **STATUS.md**：描述“当前已经完成 / 部分完成 / 未完成什么”。
3. **PRODUCT.md + AGENT_CONTRACT.md**：描述“当前版本应该怎样工作”。
4. **ROADMAP.md**：描述“未来准备做什么”。
5. **VISION.md**：描述长期方向，不代表功能已经实现。

不要因为 ROADMAP 或 VISION 中出现某项能力，就在 README 中把它写成“已完成”。

## 3. 每次开发前的阅读顺序

小改动：

```text
STATUS
  ↓
相关源码
  ↓
开发
```

涉及新功能或业务规则：

```text
STATUS
  ↓
ROADMAP
  ↓
PRODUCT / AGENT_CONTRACT
  ↓
ARCHITECTURE / DATA_MODEL
  ↓
开发
```

涉及架构变化：

```text
VISION
  ↓
ARCHITECTURE
  ↓
DECISIONS
  ↓
ROADMAP
  ↓
代码
```

## 4. 文档更新规则

以下改动必须同步文档：

- 新增或删除核心数据模型 → 更新 `DATA_MODEL.md`。
- 新增 Agent Tool 或改变权限 → 更新 `AGENT_CONTRACT.md`。
- 改变服务分层、运行边界、基础设施 → 更新 `ARCHITECTURE.md`。
- 完成里程碑或发现重要技术债 → 更新 `STATUS.md`。
- 改变优先级或版本范围 → 更新 `ROADMAP.md`。
- 做出难以逆转的技术决策 → 在 `DECISIONS.md` 追加 ADR。
- 改变 MVP 定义或验收条件 → 更新 `PRODUCT.md`。

## 5. 当前开发原则

在没有充分理由之前，坚持：

- 单 Agent 优先。
- MySQL + Prisma 优先。
- 确定性业务逻辑优先于让 LLM 决策。
- LearningEvent 保存证据，LearningState 保存当前投影。
- Agent Tool 只能通过 Service 写数据。
- 先跑通真实学习闭环，再扩展 PDF / RAG / 多 Agent。
- V0.x 优先服务单个真实用户，不提前建设平台化能力。

## 6. 开发完成定义

一个功能不是“页面出现了”就算完成。至少应满足：

```text
Product behavior
  + Data model
  + Service boundary
  + API / Tool contract
  + Error handling
  + Tests
  + Documentation update
  = Done
```

如果其中任何一项缺失，应在 `STATUS.md` 中标为 **Partial**，而不是 Done。
