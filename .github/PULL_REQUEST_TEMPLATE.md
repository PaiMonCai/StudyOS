## What problem does this solve?

<!-- Describe the user/developer problem, not only the code change. -->

## Roadmap phase

<!-- Example: Phase 0 / Phase 1. Link docs/ROADMAP.md section if useful. -->

## What changed?

-

## Architecture impact

- [ ] No architecture boundary change
- [ ] Data model changed
- [ ] Agent/tool contract changed
- [ ] Learning-state algorithm changed
- [ ] API contract changed
- [ ] New dependency / infrastructure introduced

If any box except the first is checked, explain why:

## Validation

- [ ] Typecheck passes
- [ ] Unit tests pass
- [ ] Production build passes
- [ ] Integration tests added/run where relevant
- [ ] Agent eval added/run where relevant
- [ ] Migration added/tested where relevant

## Learner-model safety

- [ ] No direct LLM mutation of mastery/review state
- [ ] Learning evidence is preserved
- [ ] Multi-table state changes are transactional where needed
- [ ] Agent tools still go through Services
- [ ] No raw Prisma / SQL / shell capability was exposed to the Agent

## Documentation

- [ ] No documentation update needed
- [ ] `docs/STATUS.md` updated
- [ ] `docs/ROADMAP.md` updated
- [ ] `docs/PRODUCT.md` updated
- [ ] `docs/ARCHITECTURE.md` updated
- [ ] `docs/DATA_MODEL.md` updated
- [ ] `docs/AGENT_CONTRACT.md` updated
- [ ] `docs/DECISIONS.md` updated

## Out of scope

<!-- Explicitly list things this PR does not attempt to solve. -->
