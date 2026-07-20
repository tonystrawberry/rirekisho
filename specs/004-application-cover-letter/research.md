# Research: Application Detail & Cover Letter Workspace

**Feature**: `004-application-cover-letter`  
**Date**: 2026-07-20

## Decision 1: Application detail route with query-param tabs

- **Decision**: Route `/applications/[applicationId]` with `?tab=information` (default) or `?tab=cover-letter` for tab state.
- **Rationale**: Keeps one page component with shared application context; bookmarkable tab URLs satisfy FR-014 without parallel route complexity.
- **Alternatives considered**:
  - Nested routes (`/applications/[id]/cover-letter`): rejected as heavier refactor for two tabs only.
  - Client-only tab state: rejected because bookmarking/sharing tab URLs is a spec requirement.

## Decision 2: CoverLetter as 1:1 child of JobApplication

- **Decision**: New `CoverLetter` model with unique `applicationId`; replace nullable `coverLetterId` string on `JobApplication` with a proper relation.
- **Rationale**: Spec defines cover letter as a first-class resource with its own content and chat. A dedicated table enables cascade delete and clean queries.
- **Alternatives considered**:
  - Store markdown in `JobApplication.description` or a JSON field: rejected — conflates application metadata with cover letter document.
  - Keep `coverLetterId` as opaque string: rejected — was a placeholder from 003; proper FK is cleaner.

## Decision 3: Separate CoverLetterConversation model

- **Decision**: Mirror `ChatConversation` pattern — one conversation per cover letter, messages stored as JSON array.
- **Rationale**: Proven pattern in codebase (`lib/ai/conversation.ts`); independent lifecycle from resume chat.
- **Alternatives considered**:
  - Reuse `ChatConversation` with a polymorphic owner: rejected — different context, prompts, and tool behaviors.
  - Embed messages in `CoverLetter` row: rejected — messages can grow large; separation matches resume pattern.

## Decision 4: Split-pane Cover Letter tab (chat left, editor/preview right)

- **Decision**: Reuse workspace layout pattern from `workspace-client.tsx` — chat panel left, content panel right with markdown textarea + `react-markdown` rendered preview.
- **Rationale**: User explicitly requested resume-builder-like UX; existing components and layout conventions reduce implementation risk.
- **Alternatives considered**:
  - Single-pane toggle between edit and preview: rejected — worse UX for iterative drafting.
  - WYSIWYG editor: rejected by spec (markdown-only v1).

## Decision 5: AI confirmation gate for cover letter suggestions

- **Decision**: AI chat proposes cover letter text via a structured suggestion; user must confirm before content replaces the editor. Manual edits save immediately via PATCH.
- **Rationale**: Matches resume patch-confirm pattern (`components/chat/patch-confirm.tsx`); prevents accidental overwrites (FR-012).
- **Alternatives considered**:
  - Auto-apply AI output: rejected — violates FR-012 and risks data loss.

## Decision 6: List page navigates to detail; edit modal removed

- **Decision**: Clicking an application row/title navigates to `/applications/[id]`; remove edit dialog from list. Create dialog remains on list page.
- **Rationale**: FR-001 and FR-016; detail page becomes the single editing surface for existing applications.
- **Alternatives considered**:
  - Keep modal for quick edits: rejected — duplicates form and conflicts with spec.
