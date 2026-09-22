# Development Guide

## 1. 本地环境

Requirements：

- Node.js >= 22.18
- Docker
- MySQL 8（推荐使用 compose）
- OpenAI API key

启动：

```bash
git clone https://github.com/PaiMonCai/StudyOS.git
cd StudyOS

npm install
cp .env.example .env

docker compose up -d mysql

npm run db:generate
npm run db:migrate -- --name init
npm run db:seed

npm run dev
```

> 当前仓库尚未提交初始 migration 与 package-lock，这是 Phase 0 必修项。完成后应改用稳定的 migration / `npm ci` 工作流。

## 2. 常用命令

```bash
npm run dev
npm run build
npm run typecheck
npm test

npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

## 3. 开发一个新功能的顺序

推荐 vertical slice：

```text
Product behavior
  ↓
Data / invariant
  ↓
Pure business logic
  ↓
Service
  ↓
API or Tool
  ↓
UI
  ↓
Tests
  ↓
Docs
```

不要先把 UI 做完，再想数据库应该长什么样。

## 4. 新 API

新增 route 前先问：

- 是否已有 Service 可以复用？
- 输入是否 Zod validate？
- error code 是否稳定？
- 是否涉及 user ownership？
- 是否应该由 Agent Tool 调用而不是 UI？

Route 层只做：

```text
parse
→ authorize
→ call
→ map result/error
```

## 5. 新 Agent Tool

流程：

1. 在 Service 中实现业务能力。
2. 给 Tool 定义最小 schema。
3. Tool 调 Service。
4. 不把 `userId` 暴露给模型。
5. 定义失败行为。
6. 加 eval / integration case。
7. 更新 `AGENT_CONTRACT.md`。

## 6. 新数据字段 / 模型

必须同时考虑：

- migration；
- backward compatibility；
- seed；
- existing data；
- transaction；
- index；
- event evidence；
- docs。

原则：

> 不要把 schema 当“类型定义”，它是长期数据契约。

## 7. LearningState 修改

这是高风险改动。

任何修改 mastery / confidence / review 的逻辑应：

- 先修改 pure Learning Engine；
- 加 unit tests；
- 保留原始 LearningEvent；
- 考虑 algorithm versioning；
- 不在 Tool / route 中偷偷加入规则。

## 8. Error handling

推荐稳定错误码：

```text
CONCEPT_NOT_FOUND
SESSION_NOT_FOUND
NO_ACTIVE_QUESTION
INVALID_REQUEST
OPENAI_API_KEY_MISSING
INTERNAL_ERROR
```

未来统一成：

```json
{
  "error": {
    "code": "CONCEPT_NOT_FOUND",
    "message": "...",
    "details": {}
  }
}
```

目前尚未完全统一，见 STATUS。

## 9. Commit

建议 conventional style：

```text
feat:
fix:
refactor:
test:
docs:
chore:
ci:
```

一条 commit 尽量只表达一个逻辑变化。

## 10. Definition of Done

### 普通功能

- [ ] 产品行为明确
- [ ] 数据不变量明确
- [ ] Service 实现
- [ ] API / Tool schema
- [ ] 错误处理
- [ ] tests
- [ ] typecheck
- [ ] build
- [ ] docs updated
- [ ] STATUS updated if milestone changes

### Agent 功能

额外：

- [ ] tool 权限最小化
- [ ] no raw Prisma
- [ ] tool call eval
- [ ] prompt regression considered
- [ ] malformed / missing state tested

### Data model

额外：

- [ ] migration
- [ ] seed impact
- [ ] index
- [ ] transaction
- [ ] DATA_MODEL updated

## 11. Review checklist

代码 Review 时重点看：

### Architecture

- 有没有跨层调用？
- Agent 有没有承担业务状态？
- UI 有没有复制算法？

### Data

- 是否会产生半完成 transaction？
- 是否会重复 ReviewTask？
- 是否会错误覆盖 historical evidence？

### Agent

- Tool 是否过度授权？
- 参数是否允许模型直接控制关键状态？
- prompt 是否依赖隐含数据库事实？

### UX

- 用户能否理解发生了什么？
- 用户是否能纠正 Agent 错判？

## 12. Before merge

目标工作流：

```bash
npm ci
npm run db:generate
npm run typecheck
npm test
npm run build
```

如果涉及 DB：

- migration test；
- service integration test。

如果涉及 Agent：

- agent eval。

## 13. 文档纪律

开发完成时不要只写代码。

按 [README.md](./README.md) 中规则更新相应文档。

文档与代码冲突时应立即修复，不允许长期依赖“开发者脑内上下文”。
