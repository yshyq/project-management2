# Project-First Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make non-deployment support start from an existing deployed project, derive its customer automatically, and retain product-level selection.

**Architecture:** Extend the deployment-project option read model with customer identity and allow an unfiltered query. Centralize backend project resolution so non-deployment ticket creation and update derive the customer and validate product membership. Update the Vue form to load projects directly and treat customer as read-only derived data.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, Pytest, Vue 3, TypeScript, Vitest, Vue Test Utils, Playwright

---

### Task 1: Backend project resolution contract

**Files:**
- Modify: `backend/tests/test_api.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/schemas.py`

- [x] Add failing tests proving unfiltered deployment options include customer identity.
- [x] Add failing tests proving non-deployment creation derives customer from the project and validates product membership.
- [x] Run focused Pytest cases and confirm expected failures.
- [x] Implement a deployment-project resolver shared by create and update.
- [x] Run focused and full backend tests.

### Task 2: Frontend form rules and API types

**Files:**
- Modify: `frontend/src/pages/supportForm.test.ts`
- Modify: `frontend/src/pages/supportForm.ts`
- Modify: `frontend/src/api/index.test.ts`
- Modify: `frontend/src/api/index.ts`
- Modify: `frontend/src/api/types.ts`

- [x] Add failing tests for project selection deriving customer and clearing product.
- [x] Add a failing API test for loading all deployment projects.
- [x] Update types, state helpers, validation, and payload construction.
- [x] Run focused and full frontend unit tests.

### Task 3: Vue support interaction

**Files:**
- Modify: `frontend/src/pages/SupportPage.test.ts`
- Modify: `frontend/src/pages/SupportPage.vue`

- [x] Add failing component tests showing non-deployment forms have no editable customer selector.
- [x] Add failing component tests for project-first loading, customer display, product filtering, and submit payload.
- [x] Implement the project-first controls and loading/error states.
- [x] Run component tests, typecheck, and build.

### Task 4: Browser regression

**Files:**
- Modify: `frontend/e2e/support-workflow.spec.mjs`

- [x] Update the browser flow to select a project directly for all non-deployment support types.
- [x] Assert the customer is automatically displayed and the submitted ticket uses the project customer.
- [x] Run the complete Playwright workflow and inspect browser error evidence.

### Task 5: Final verification

**Files:**
- No production changes expected.

- [x] Run all backend tests.
- [x] Run all frontend unit tests.
- [x] Run frontend typecheck and production build.
- [x] Run the complete browser end-to-end suite.
- [x] Review the final diff against every business rule in the design.
