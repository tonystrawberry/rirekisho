# Feature Specification: Application Detail & Cover Letter Workspace

**Feature Branch**: `004-application-cover-letter`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "When clicking on an application, redirect to the application page with two tabs (Information, Cover Letter). Information tab contains the form like in the edit modal, but cover letter tab should be a page just like the AI resume builder. An AI chat on the left and a cover letter preview (with possibility to edit text directly) on the right. Allow markdown formatting for the cover letter."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open Application Detail Page (Priority: P1)

A signed-in job seeker clicks an application from the list and lands on a dedicated application page showing the application title, status, and two tabs: Information and Cover Letter.

**Why this priority**: The detail page is the entry point for all deeper work on an application. Without it, users cannot access the cover letter workspace or a full-page editing experience.

**Independent Test**: Can be fully tested by clicking any application in the list and verifying navigation to its detail page with both tabs visible and the correct application loaded.

**Acceptance Scenarios**:

1. **Given** a signed-in user viewing the applications list, **When** they click an application row or title, **Then** they are redirected to that application's detail page.
2. **Given** a user on an application detail page, **When** the page loads, **Then** they see the application title, current status, and tabs labeled "Information" and "Cover Letter".
3. **Given** a user who navigates directly to another user's application URL, **When** the page loads, **Then** access is denied without revealing whether the application exists.
4. **Given** a user on the application detail page, **When** they use browser back navigation, **Then** they return to the applications list with list state preserved where possible.

---

### User Story 2 - Edit Application Information on Detail Page (Priority: P1)

A job seeker uses the Information tab to view and update all application fields previously available in the edit modal: title, description, company, job URL, status, applied date, and linked resume.

**Why this priority**: Moving edit into a dedicated page replaces the modal workflow and keeps application metadata management on par with the existing tracker feature.

**Independent Test**: Can be fully tested by opening an application's Information tab, changing fields, saving, and confirming updates persist and reflect on the list page.

**Acceptance Scenarios**:

1. **Given** a user on the Information tab, **When** they view the form, **Then** they see all editable application fields with current values pre-filled.
2. **Given** a user editing application information, **When** they save valid changes, **Then** the updates persist and are shown when the page is reloaded.
3. **Given** a user editing application information, **When** they clear the required title, **Then** save is blocked with a clear validation message.
4. **Given** a user on the Information tab, **When** they switch to another tab and return, **Then** unsaved changes are either preserved with a warning or saved according to explicit user action (no silent data loss).

---

### User Story 3 - Draft Cover Letter with AI Chat (Priority: P1)

A job seeker opens the Cover Letter tab and uses an AI assistant (similar to the resume builder experience) to draft or refine a cover letter tailored to the application, using context from the application details and linked resume when available.

**Why this priority**: AI-assisted drafting is the core value of the cover letter workspace and differentiates it from a plain text editor.

**Independent Test**: Can be fully tested by opening the Cover Letter tab for an application with basic metadata, chatting with the assistant, and verifying generated content appears in the cover letter preview.

**Acceptance Scenarios**:

1. **Given** a user on the Cover Letter tab, **When** the tab loads, **Then** they see a chat panel on the left and a cover letter preview panel on the right.
2. **Given** a user with an application that has a title and company name, **When** they ask the assistant to draft a cover letter, **Then** the assistant produces relevant content that references the role and company appropriately.
3. **Given** a user with a linked resume on the application, **When** they request a tailored cover letter, **Then** the assistant incorporates relevant experience from the linked resume without inventing credentials.
4. **Given** an ongoing cover letter chat, **When** the user leaves and returns later, **Then** prior chat history and cover letter content are restored.
5. **Given** a user who accepts AI-suggested cover letter content, **When** they confirm the suggestion, **Then** the cover letter preview updates with the accepted text.

---

### User Story 4 - Edit and Preview Cover Letter with Markdown (Priority: P1)

A job seeker edits cover letter content directly in the preview area or via a text editor, using markdown formatting, and sees the rendered result update accordingly.

**Why this priority**: Users need direct control over final wording and formatting; markdown support enables professional structure (paragraphs, emphasis, lists) without a complex rich-text editor.

**Independent Test**: Can be fully tested by typing markdown in the cover letter editor (e.g., bold, lists, headings) and verifying the preview renders correctly and persists after save.

**Acceptance Scenarios**:

1. **Given** a user on the Cover Letter tab, **When** they edit the cover letter text directly, **Then** the preview reflects their changes.
2. **Given** a user entering markdown syntax (e.g., headings, bold, italic, bullet lists), **When** they view the preview, **Then** the markdown is rendered as formatted text.
3. **Given** a user who edits the cover letter manually, **When** they save or navigate away and return, **Then** their edits are persisted.
4. **Given** a user who receives AI-suggested content, **When** they manually edit the suggestion afterward, **Then** their manual edits take precedence over the prior suggestion.

---

### User Story 5 - Navigate Between Tabs Without Losing Context (Priority: P2)

A job seeker switches between the Information and Cover Letter tabs while working on an application, with each tab retaining its state during the session.

**Why this priority**: Users frequently alternate between updating application metadata and refining the cover letter; smooth tab switching reduces friction.

**Independent Test**: Can be fully tested by editing information, switching to Cover Letter, making edits, switching back, and confirming both tabs retain their respective content.

**Acceptance Scenarios**:

1. **Given** a user on the Information tab with unsaved changes, **When** they switch to the Cover Letter tab, **Then** they are warned about unsaved changes or changes are auto-saved before switching.
2. **Given** a user on the Cover Letter tab with a draft in progress, **When** they switch to Information and back, **Then** the cover letter content and chat history remain available.
3. **Given** a user sharing or bookmarking a tab-specific URL, **When** they open that URL, **Then** the correct tab is active on page load.

---

### User Story 6 - Delete Application from Detail Page (Priority: P3)

A job seeker deletes an application from the detail page and is returned to the applications list.

**Why this priority**: Deletion is a secondary action; users primarily visit the detail page to edit information or work on cover letters.

**Independent Test**: Can be fully tested by deleting an application from the detail page and confirming it no longer appears in the list while linked resumes remain intact.

**Acceptance Scenarios**:

1. **Given** a user on an application detail page, **When** they confirm deletion, **Then** the application and its cover letter are removed and the user is redirected to the applications list.
2. **Given** a user who cancels deletion, **When** they dismiss the confirmation, **Then** they remain on the detail page with no data removed.

---

### Edge Cases

- What happens when an application has no linked resume? The Cover Letter tab still works; the AI assistant uses application metadata only and does not block the user.
- What happens when the linked resume is deleted? The Information tab shows the resume as unavailable; the Cover Letter tab continues to work with remaining application context.
- What happens when cover letter content is empty? The preview shows a helpful empty state prompting the user to start via chat or direct editing.
- What happens when markdown contains invalid or unsupported syntax? The preview renders supported elements and shows unsupported syntax as plain text without breaking the page.
- What happens when AI generation fails? The user sees a clear error message and can continue editing manually.
- What happens when two browser tabs edit the same application? Last save wins; no real-time collaboration in v1.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST navigate users from the applications list to a dedicated detail page when they click an application.
- **FR-002**: System MUST display two tabs on the application detail page: "Information" and "Cover Letter".
- **FR-003**: System MUST show the Information tab form with the same editable fields as the current application edit modal (title, description, company name, job URL, status, applied date, linked resume).
- **FR-004**: System MUST persist Information tab changes to the existing application record.
- **FR-005**: System MUST provide a Cover Letter tab with a split layout: AI chat on the left and cover letter preview on the right.
- **FR-006**: System MUST allow users to edit cover letter content directly in addition to AI-assisted generation.
- **FR-007**: System MUST support markdown formatting in cover letter content and render it in the preview.
- **FR-008**: System MUST persist cover letter content per application and restore it on subsequent visits.
- **FR-009**: System MUST persist cover letter chat history per application and restore it on subsequent visits.
- **FR-010**: System MUST use application metadata (title, company, description, job URL) as context for cover letter AI assistance.
- **FR-011**: System MUST use linked resume content as additional context for cover letter AI assistance when a resume is linked.
- **FR-012**: System MUST require user confirmation before AI-suggested cover letter content replaces existing content.
- **FR-013**: System MUST ensure users can only access their own application detail pages and cover letters.
- **FR-014**: System MUST allow tab-specific navigation so users can link directly to Information or Cover Letter.
- **FR-015**: System MUST handle missing or deleted linked resumes gracefully on both tabs.
- **FR-016**: System MUST remove the application edit modal from the list page in favor of navigation to the detail page (create flow may remain on the list page).

### Key Entities

- **Application (existing)**: The job opportunity being tracked. Detail page is the primary editing surface. May reference zero or one cover letter.
- **Cover Letter (new)**: A user-owned document tied to one application. Key attributes: markdown content, created/updated timestamps. Has its own chat conversation for AI-assisted drafting.
- **Cover Letter Conversation (new)**: Stateful chat history for cover letter drafting, scoped to one application/cover letter. Messages persist across sessions.
- **Resume (existing)**: Optional linked resource providing context for cover letter generation; not modified by this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can open an application detail page from the list in one click.
- **SC-002**: Users can update application information on the detail page and see changes reflected on the list within one page reload.
- **SC-003**: Users can generate a first draft cover letter via chat in under 3 minutes for an application with basic metadata filled in.
- **SC-004**: 95% of common markdown elements (paragraphs, bold, italic, bullet lists) render correctly in the cover letter preview.
- **SC-005**: Cover letter content and chat history persist across sessions without data loss for the same application.
- **SC-006**: 100% of attempts to access another user's application detail page are blocked.
- **SC-007**: Users can switch between Information and Cover Letter tabs without losing in-progress work.

## Assumptions

- Users are already authenticated; the same sign-in used for applications and resumes applies here.
- Each application has at most one cover letter in v1.
- Cover letter content is stored as markdown text; no WYSIWYG rich-text editor in v1.
- The Cover Letter tab layout mirrors the resume workspace pattern (chat left, preview right) for consistency.
- AI assistance uses the same provider and interaction patterns as the existing resume chat feature.
- Clicking an application row navigates to the detail page; list-page edit modal is replaced by this flow.
- Creating new applications may still happen from the list page; only viewing/editing existing applications moves to the detail page.
- Cover letter PDF export, translation, and templates are out of scope for v1.
- Real-time collaborative editing and version history for cover letters are out of scope for v1.

## Future Recommendations (Out of Scope for v1)

- **Cover letter templates**: Pre-built structures (formal, creative, short) to seed the editor.
- **Export**: Download cover letter as PDF or copy formatted text for email/paste.
- **Tone selector**: Adjust AI output tone (formal, enthusiastic, concise).
- **Version history**: Track revisions and allow rollback to prior drafts.
- **Job description import**: Parse job posting URL content to enrich AI context automatically.
