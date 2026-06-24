# Support Project Product Linkage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make deployment requests support multiple products and make all other support requests select an existing deployed project and one of that project's products.

**Architecture:** Keep the existing `SupportPage.vue` route reuse, but move form state transitions and payload construction into a focused TypeScript module. Add a typed API method for customer deployment projects at `/customers/{customerId}/deployment-projects`, then render deployment and non-deployment fields conditionally in the page.

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, Vue Test Utils, jsdom

---

### Task 1: Test Infrastructure And Form Rules

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.mjs`
- Create: `frontend/src/pages/supportForm.ts`
- Test: `frontend/src/pages/supportForm.test.ts`

- [ ] Add Vitest, Vue Test Utils, and jsdom to the frontend development dependencies and add `npm.cmd run test`.
- [ ] Write failing tests proving customer changes clear project/product, project changes clear product, deployment validation requires customer/project/products, and payloads use `productIds` for deployment versus `productId` for other support.
- [ ] Run the focused test and confirm failures are caused by missing form-rule implementation.
- [ ] Implement the smallest state helpers, validators, product display helper, and payload builders that satisfy the tests.
- [ ] Re-run the focused test until green.

### Task 2: Typed Deployment Project API

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/index.ts`
- Test: `frontend/src/api/index.test.ts`

- [ ] Write a failing API test expecting `api.deploymentProjects(customerId)` to call `/customers/{customerId}/deployment-projects`.
- [ ] Add `DeploymentProject`, typed create-ticket payloads, and multi-product response fields.
- [ ] Implement `api.deploymentProjects` and strongly type `api.createTicket`.
- [ ] Run the API test and all unit tests until green.

### Task 3: Support Form Interaction

**Files:**
- Modify: `frontend/src/pages/SupportPage.vue`
- Modify: `frontend/src/styles.css`
- Test: `frontend/src/pages/SupportPage.test.ts`

- [ ] Write failing component tests for deployment project-name input and product multi-select.
- [ ] Write failing component tests for non-deployment disabled project/product selects, customer-driven loading, project-scoped products, stale-value clearing, empty states, validation errors, and submit payloads.
- [ ] Implement conditional controls, loading/error/empty states, accessible labels, keyboard-compatible native controls, and submit guards.
- [ ] Add compact form-error and checkbox-group styles consistent with the existing application.
- [ ] Run component and unit tests until green.

### Task 4: Multi-Product Display

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/pages/SupportPage.vue`
- Test: `frontend/src/pages/supportForm.test.ts`

- [ ] Add a failing display test for `products`, `productNames`, and legacy `productName` response shapes.
- [ ] Render all deployment products in list and detail views with legacy fallback.
- [ ] Run all frontend tests and confirm green.

### Task 5: Verification

**Files:**
- No production file changes expected.

- [ ] Run `npm.cmd run test`.
- [ ] Run `npm.cmd run typecheck`.
- [ ] Run `npm.cmd run build`.
- [ ] Use the Browser plugin against `http://127.0.0.1:5175` when available; otherwise record the Browser runtime failure and use the configured test/mock coverage.
- [ ] Confirm the only pending backend integration is `GET /api/customers/{customerId}/deployment-projects` and the updated `POST /api/support-tickets` request contract.
