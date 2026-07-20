# Implementation Plan: Application Detail & Cover Letter Workspace

**Branch**: `004-application-cover-letter` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-application-cover-letter/spec.md`

## Summary

Extend the job application tracker with a dedicated application detail page (`/applications/[applicationId]`) containing Information and Cover Letter tabs. The Information tab replaces the list-page edit modal with a full-page form. The Cover Letter tab mirrors the resume workspace: AI chat on the left, markdown editor + rendered preview on the right, with persisted cover letter content and chat history per application.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20+

**Primary Dependencies**: Next.js App Router, React, Prisma ORM, Auth.js, Zod, Vercel AI SDK (`ai`, `@ai-sdk/react`), `react-markdown` (already in project)

**Storage**: PostgreSQL via Prisma — new `CoverLetter` and `CoverLetterConversation` models; update `JobApplication` relation

**Testing**: Vitest for unit/integration; manual smoke per `quickstart.md`

**Target Platform**: Web application (Vercel-compatible Node runtime)

**Project Type**: Full-stack Next.js monolith

**Performance Goals**: Detail page loads in under 2 seconds; cover letter preview updates within 200ms of typing; chat first token under 2 seconds under normal load

**Constraints**: Per-user isolation mandatory; AI suggestions require explicit user confirmation before replacing cover letter content; markdown-only (no WYSIWYG); reuse existing resume chat patterns

**Scale/Scope**: One cover letter per application; no PDF export, templates, or version history in v1

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Spec coverage (FR-001..FR-016) | PASS | All flows mapped in design artifacts |
| Security and ownership boundaries | PASS | All routes scoped by session user + application ownership |
| Simplicity / minimal scope | PASS | Reuses workspace/chat patterns; no new services |
| Constitution-defined mandatory principles | N/A | Constitution template unfilled |

**Post-design re-check**: PASS. Single-app extension; cover letter is 1:1 with application; chat mirrors existing `ChatConversation` pattern.

## Project Structure

### Documentation (this feature)

```text
specs/004-application-cover-letter/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
└── tasks.md             # Created by /speckit-tasks
```

### Source Code (repository root)

```text
app/
├── (app)/
│   └── applications/
│       ├── page.tsx                          # list (updated: click → navigate)
│       ├── applications-client.tsx           # list (remove edit modal)
│       └── [applicationId]/
│           ├── page.tsx                      # detail shell + tab routing
│           └── application-detail-client.tsx # tabs: Information + Cover Letter
├── api/
│   └── applications/
│       └── [applicationId]/
│           ├── cover-letter/
│           │   ├── route.ts                  # GET/PATCH cover letter content
│           │   └── chat/
│           │       └── route.ts            # POST/GET cover letter chat
│           └── route.ts                      # existing CRUD (unchanged)
components/
├── applications/
│   ├── application-form.tsx                  # shared Information tab form
│   ├── cover-letter-editor.tsx             # markdown textarea + preview
│   └── cover-letter-chat.tsx               # AI chat panel (like EnrichmentChat)
lib/
├── applications/
│   ├── schema.ts                             # existing
│   └── cover-letter.ts                       # load/save helpers, context builder
├── ai/
│   └── cover-letter-chat.ts                  # system prompt + suggestion tools
prisma/
└── schema.prisma                             # CoverLetter, CoverLetterConversation
```

**Structure Decision**: Extend existing `applications` area with a dynamic `[applicationId]` route. Cover letter chat and content APIs nest under the application resource. Reuse `EnrichmentChat` / `useChat` patterns from resume workspace rather than inventing new chat infrastructure.

## Complexity Tracking

No constitution violations require justification.
