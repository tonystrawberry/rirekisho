# Tasks: Application Detail & Cover Letter Workspace

**Input**: Design documents from `/specs/004-application-cover-letter/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Not included as separate TDD phase — not explicitly requested in the feature specification. Manual smoke per `quickstart.md`.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Paths follow `plan.md` (Next.js App Router): `app/`, `components/`, `lib/`, `prisma/`.

---

## Phase 1: Setup

**Purpose**: Add CoverLetter data model and remove the placeholder `coverLetterId` string from JobApplication

- [X] T001 Add `CoverLetter` and `CoverLetterConversation` models to `prisma/schema.prisma` per data-model.md (CoverLetter: id, applicationId unique FK → JobApplication onDelete Cascade, content default "", timestamps; CoverLetterConversation: id, coverLetterId unique FK → CoverLetter onDelete Cascade, status, messages Json default [], timestamps)
- [X] T002 Update `JobApplication` in `prisma/schema.prisma`: remove `coverLetterId String?` field; add optional relation `coverLetter CoverLetter?`
- [X] T003 Run `npx prisma migrate dev` and `npx prisma generate` to apply migration and regenerate the Prisma client

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared helpers, Zod schemas, and list/API cleanup required before any user story UI

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create cover letter Zod schemas in `lib/applications/cover-letter-schema.ts` — content max 50,000 chars for PATCH; apply-suggestion body with `content` + `confirmReplace: true`
- [X] T005 [P] Create cover letter load/save helpers in `lib/applications/cover-letter.ts` — get-or-create CoverLetter + CoverLetterConversation by applicationId; update content; ownership check via session user + JobApplication
- [X] T006 [P] Create application AI context builder in `lib/applications/cover-letter.ts` (or adjacent helper) — build ApplicationContext from JobApplication fields + optional linked MasterResumeProfile.data
- [X] T007 Remove `coverLetterId` from Zod application schemas in `lib/applications/schema.ts` and from API serializers in `app/api/applications/route.ts` and `app/api/applications/[applicationId]/route.ts`
- [X] T008 Remove `coverLetterId` from list page types and create payload in `app/(app)/applications/page.tsx` and `app/(app)/applications/applications-client.tsx` (including "coming soon" cover letter UI from 003)

**Checkpoint**: Prisma models ready; helpers and schemas in place; list/API no longer reference placeholder coverLetterId

---

## Phase 3: User Story 1 - Open Application Detail Page (Priority: P1) 🎯 MVP

**Goal**: Signed-in user clicks an application and lands on `/applications/[applicationId]` with title, status, and Information / Cover Letter tabs

**Independent Test**: Click any application in the list → navigate to detail page with both tabs visible and correct application loaded; other user's URL returns 404

### Implementation for User Story 1

- [X] T009 [US1] Create server page `app/(app)/applications/[applicationId]/page.tsx` — load application by id + session userId (404 if missing/unauthorized); parse `?tab=information|cover-letter` (default information); pass application + active tab to client
- [X] T010 [US1] Create `app/(app)/applications/[applicationId]/application-detail-client.tsx` shell with application title, status badge, and tab headers "Information" / "Cover Letter"; tab switches update URL query `?tab=` without full navigation loss
- [X] T011 [US1] Update `app/(app)/applications/applications-client.tsx` so clicking an application row/title navigates to `/applications/[applicationId]` (remove edit-modal open on click); keep create dialog on list page

**Checkpoint**: List → detail navigation works; tabs visible; unauthorized access returns 404; browser back returns to list

---

## Phase 4: User Story 2 - Edit Application Information on Detail Page (Priority: P1)

**Goal**: Information tab shows full editable application form; saves persist via existing PATCH API

**Independent Test**: Open Information tab → change fields → save → reload persists; empty title blocked; list reflects updates

### Implementation for User Story 2

- [X] T012 [P] [US2] Extract shared application form into `components/applications/application-form.tsx` (title, description, company, job URL, status, applied date, linked resume picker) reusable from create dialog and Information tab
- [X] T013 [US2] Wire Information tab in `application-detail-client.tsx` to render `application-form.tsx` pre-filled; submit PATCH to `/api/applications/[applicationId]`; show validation errors; refresh local state on success
- [X] T014 [US2] Refactor create dialog in `applications-client.tsx` to use shared `application-form.tsx`; remove list-page edit modal/dialog entirely (FR-016)

**Checkpoint**: Full-page Information edit replaces modal; validation and persistence match existing CRUD behavior

---

## Phase 5: User Story 3 - Draft Cover Letter with AI Chat (Priority: P1)

**Goal**: Cover Letter tab provides AI chat (left) that drafts/refines cover letters using application + linked resume context; suggestions require user confirm before applying

**Independent Test**: Open Cover Letter tab → chat to draft → suggestion appears → confirm → preview updates; history restored on return

### Implementation for User Story 3

- [X] T015 [P] [US3] Implement GET/PATCH handlers in `app/api/applications/[applicationId]/cover-letter/route.ts` per contracts/api.md — ownership-scoped get-or-create; PATCH validates content ≤50k
- [X] T016 [P] [US3] Implement cover letter AI system prompt + `coverLetterSuggestion` tool in `lib/ai/cover-letter-chat.ts` (mirror resume chat patterns; inject ApplicationContext; never invent credentials)
- [X] T017 [US3] Implement GET/POST chat handlers in `app/api/applications/[applicationId]/cover-letter/chat/route.ts` — load/persist CoverLetterConversation messages; POST streams via AI SDK; persist messages on stream end
- [X] T018 [US3] Implement POST apply-suggestion in `app/api/applications/[applicationId]/cover-letter/apply-suggestion/route.ts` — requires `confirmReplace: true`; replaces cover letter content
- [X] T019 [US3] Create `components/applications/cover-letter-chat.tsx` — AI chat panel using `@ai-sdk/react` `useChat` against cover-letter chat endpoint; load history via GET; show suggestion confirm UI (reuse `components/chat/patch-confirm.tsx` pattern) before calling apply-suggestion
- [X] T020 [US3] Integrate chat panel into Cover Letter tab layout in `application-detail-client.tsx` (left pane); on confirmed suggestion, update editor content state

**Checkpoint**: AI chat drafts cover letters with app/resume context; history persists; suggestions never auto-apply

---

## Phase 6: User Story 4 - Edit and Preview Cover Letter with Markdown (Priority: P1)

**Goal**: User edits cover letter markdown directly; rendered preview updates; content persists via PATCH

**Independent Test**: Type markdown (bold, lists, headings) → preview renders → save/return → content restored; manual edits override prior AI suggestion

### Implementation for User Story 4

- [X] T021 [P] [US4] Create `components/applications/cover-letter-editor.tsx` — markdown textarea + `react-markdown` preview; empty state prompting chat or direct edit; debounce or explicit save calling PATCH `/api/applications/[applicationId]/cover-letter`
- [X] T022 [US4] Complete Cover Letter tab split layout in `application-detail-client.tsx` — chat left, editor/preview right (mirror `workspace-client.tsx` pattern); load initial content from GET cover-letter on tab mount
- [X] T023 [US4] Ensure AI-applied content and manual edits share one content state so manual edits take precedence after apply; persist on save/blur/navigate

**Checkpoint**: Markdown edit + preview works; content persists across sessions; empty state handled

---

## Phase 7: User Story 5 - Navigate Between Tabs Without Losing Context (Priority: P2)

**Goal**: Tab switches preserve in-progress work; tab-specific URLs deep-link correctly

**Independent Test**: Edit Information → switch tabs with warning or save → Cover Letter draft/chat retained; bookmark `?tab=cover-letter` opens correct tab

### Implementation for User Story 5

- [X] T024 [US5] Add unsaved-changes guard on Information tab in `application-detail-client.tsx` — warn or auto-save before switching away when form is dirty (FR-015 / US5 scenarios)
- [X] T025 [US5] Keep Cover Letter content + chat mounted or restore from state/API when switching back so draft and history remain available within the session
- [X] T026 [US5] Sync tab UI with `?tab=` query on load and on tab click (already started in US1); ensure shared/bookmarked tab URLs activate the correct tab

**Checkpoint**: No silent data loss on tab switch; deep links work

---

## Phase 8: User Story 6 - Delete Application from Detail Page (Priority: P3)

**Goal**: User can delete application from detail page with confirm; cascade removes cover letter; redirect to list

**Independent Test**: Confirm delete → redirected to `/applications`, item gone, linked resumes intact; cancel leaves page unchanged

### Implementation for User Story 6

- [X] T027 [US6] Add delete action + confirmation dialog to `application-detail-client.tsx` — call existing `DELETE /api/applications/[applicationId]`; on success `router.push('/applications')`
- [X] T028 [US6] Verify cascade: deleting application removes CoverLetter + CoverLetterConversation (Prisma onDelete Cascade from T001); linked resume rows remain

**Checkpoint**: Detail-page delete works end-to-end with confirm/cancel

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, cleanup, and quickstart validation across stories

- [X] T029 [P] Handle missing/deleted linked resume gracefully on Information tab (unavailable label) and Cover Letter AI context (metadata-only) in `application-form.tsx` / `lib/applications/cover-letter.ts`
- [X] T030 [P] Handle AI chat failure with clear error message in `cover-letter-chat.tsx` while keeping manual editor usable
- [X] T031 Run full smoke validation from `specs/004-application-cover-letter/quickstart.md` (navigation, Information save, Cover Letter edit/chat/persist, ownership 404, delete cascade)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — MVP entry point
- **US2 (Phase 4)**: Depends on US1 detail shell (needs tabs/page)
- **US3 (Phase 5)**: Depends on US1 detail shell; can proceed in parallel with US2 after T010
- **US4 (Phase 6)**: Depends on US3 content API (T015) for load/save; integrates with chat apply from US3
- **US5 (Phase 7)**: Depends on US2 + US4 (both tabs must exist)
- **US6 (Phase 8)**: Depends on US1 detail page; cascade verified after Phase 1 models
- **Polish (Phase 9)**: Depends on all desired user stories

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on other stories — 🎯 MVP
- **User Story 2 (P1)**: After US1 shell
- **User Story 3 (P1)**: After US1 shell (+ Foundational helpers); parallelizable with US2
- **User Story 4 (P1)**: After T015 cover-letter content API; pairs with US3 UI
- **User Story 5 (P2)**: After US2 + US4
- **User Story 6 (P3)**: After US1; independent of cover letter UI

### Within Each User Story

- Models/helpers (Phase 1–2) before endpoints
- Endpoints before UI wiring
- Story complete before moving to next priority when sequential

### Parallel Opportunities

- T004, T005, T006 can run in parallel during Foundational
- After US1 shell (T010): US2 form work and US3 API/chat work can proceed in parallel
- T015 and T016 can run in parallel before chat route (T017)
- T021 editor can start once T015 exists, in parallel with T019 chat UI
- T029 and T030 polish tasks can run in parallel

---

## Parallel Example: User Story 3

```bash
# After Foundational + US1 shell:
Task: "Implement GET/PATCH cover-letter route in app/api/applications/[applicationId]/cover-letter/route.ts"
Task: "Implement cover letter AI prompt + tool in lib/ai/cover-letter-chat.ts"

# Then sequentially:
Task: "Implement chat GET/POST in app/api/applications/[applicationId]/cover-letter/chat/route.ts"
Task: "Implement apply-suggestion route"
Task: "Build cover-letter-chat.tsx + wire into detail client"
```

---

## Parallel Example: User Stories 2 & 3

```bash
# Developer A (US2):
Task: "Extract application-form.tsx and wire Information tab"

# Developer B (US3):
Task: "Cover letter APIs + AI chat + cover-letter-chat.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (Prisma models)
2. Complete Phase 2: Foundational (helpers + list cleanup)
3. Complete Phase 3: User Story 1 (detail page + navigation)
4. **STOP and VALIDATE**: Click list → detail with tabs; ownership 404
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → schema and helpers ready
2. US1 → detail navigation MVP
3. US2 → Information editing replaces modal
4. US3 + US4 → full cover letter workspace (chat + markdown)
5. US5 → tab state / unsaved guards
6. US6 → detail delete
7. Polish → quickstart smoke

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After US1 shell:
   - Developer A: US2 (Information form)
   - Developer B: US3/US4 (cover letter APIs + UI)
3. US5 integrates both tabs; US6 and polish last

---

## Notes

- [P] tasks = different files, no incomplete-task dependencies
- [Story] label maps task to user story for traceability
- Reuse existing patterns: `EnrichmentChat`, `patch-confirm.tsx`, `workspace-client.tsx` split layout, `ChatConversation` JSON messages
- Existing `/api/applications` CRUD remains; only remove `coverLetterId` serialization
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- Avoid: auto-applying AI suggestions, WYSIWYG, PDF export, version history (out of scope)
