# Dark Tech Support Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore customer-project-product cascading support creation, remove prototype-only chrome, and deliver a cohesive dark technology-blue enterprise UI.

**Architecture:** Reuse the existing customer-filtered deployment-project API and keep backend relationship validation authoritative. Refactor SupportPage state transitions around customer selection, then apply a shared CSS token system across the existing Vue component structure without changing routes or domain ownership.

**Tech Stack:** FastAPI, SQLAlchemy, Pytest, Vue 3, TypeScript, Vitest, Vue Test Utils, CSS, Playwright

---

### Task 1: Cascading support behavior

**Files:**
- Modify: `frontend/src/pages/supportForm.test.ts`
- Modify: `frontend/src/pages/supportForm.ts`
- Modify: `frontend/src/pages/SupportPage.test.ts`
- Modify: `frontend/src/pages/SupportPage.vue`
- Modify: `frontend/src/api/index.test.ts`
- Modify: `frontend/src/api/index.ts`

- [x] Write failing tests for customer-first project loading and disabled downstream controls.
- [x] Write failing tests for clearing project/product on customer changes and clearing product on project changes.
- [x] Verify the focused tests fail for the old project-first behavior.
- [x] Implement customer selection, customer-scoped project loading, and project product selection.
- [x] Run focused and complete frontend unit tests.

### Task 2: Backend relationship verification

**Files:**
- Modify: `backend/tests/test_api.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/schemas.py`

- [x] Add focused tests for customer-scoped project options and rejected cross-customer submissions.
- [x] Run the focused tests and confirm current behavior or expose gaps.
- [x] Implement only the missing validation needed to keep customer-project-product relations authoritative.
- [x] Run the complete backend suite.

### Task 3: Remove prototype-only interface

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `frontend/src/pages/DashboardPage.vue`
- Test: `frontend/e2e/support-workflow.spec.mjs`

- [x] Add source assertions or browser checks proving no top-level search or “编辑原型” control remains.
- [x] Remove the old static controls, event handlers, and prototype status copy.
- [x] Verify page-level business filters remain available.

### Task 4: Dark technology-blue design system

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/layouts/MainLayout.vue`
- Modify: `frontend/src/pages/LoginPage.vue`
- Modify: `frontend/src/pages/SupportPage.vue`

- [x] Define shared dark palette, elevation, typography, spacing, focus, status, table, form, modal, and responsive tokens.
- [x] Refine the app shell, navigation, page header, buttons, tables, detail panels, forms, login, loading, empty, error, and success states.
- [x] Add restrained transitions and reduced-motion handling.
- [x] Run typecheck and production build.

### Task 5: Complete browser regression

**Files:**
- Modify: `frontend/e2e/support-workflow.spec.mjs`

- [x] Update the full workflow to select customer, customer project, and project product for all non-deployment support types.
- [x] Verify changing customer clears project/product and customer-without-project displays the correct empty state.
- [x] Verify no top-level search or prototype edit control exists.
- [x] Run desktop and mobile browser checks for layout overflow and visual consistency.
- [x] Capture the final implementation screenshot and compare it to the approved concept.

### Task 6: Final verification

**Files:**
- No production changes expected.

- [x] Run all backend tests.
- [x] Run all frontend tests.
- [x] Run TypeScript typecheck.
- [x] Run the production build.
- [x] Run the complete Playwright suite and inspect browser evidence.
- [x] Review every requirement in the design specification.
