# Data Model: Application Detail & Cover Letter Workspace

**Feature**: `004-application-cover-letter`  
**Date**: 2026-07-20

## Entity: CoverLetter (new)

One cover letter document per application.

### Fields

- `id` (string, cuid, primary key)
- `applicationId` (string, required, unique, foreign key → `JobApplication.id`, `onDelete: Cascade`)
- `content` (string, markdown text, default `""`)
- `createdAt` (datetime, default now)
- `updatedAt` (datetime, auto-updated)

### Relationships

- One `CoverLetter` to one `JobApplication`
- One `CoverLetter` to one `CoverLetterConversation`

### Validation Rules

- `content` max 50,000 characters
- Created lazily on first visit to Cover Letter tab or first save/chat

## Entity: CoverLetterConversation (new)

Stateful AI chat for cover letter drafting.

### Fields

- `id` (string, cuid, primary key)
- `coverLetterId` (string, required, unique, foreign key → `CoverLetter.id`, `onDelete: Cascade`)
- `status` (string, default `"active"`)
- `messages` (json array, default `[]`)
- `createdAt` (datetime, default now)
- `updatedAt` (datetime, auto-updated)

### Message Shape (JSON)

```json
{
  "id": "string",
  "role": "user | assistant",
  "content": "string"
}
```

## Entity Updates: JobApplication (existing)

### Changes

- Remove `coverLetterId` string placeholder
- Add relation: `coverLetter CoverLetter?` (optional 1:1)

### Unchanged Fields

All existing application fields remain (title, description, companyName, jobUrl, status, appliedAt, linkedResumeId, etc.)

## Entity Touchpoints

### User

- No direct relation to CoverLetter; access via owned JobApplication

### MasterResumeProfile

- Unchanged; referenced by `JobApplication.linkedResumeId` for AI context only

## Lifecycle

- **Create cover letter**: Lazy — on first Cover Letter tab visit, chat message, or manual save
- **Delete application**: Cascade deletes CoverLetter and CoverLetterConversation
- **Delete linked resume**: `linkedResumeId` set to null; cover letter content preserved

## Indexing

- `CoverLetter.applicationId` — unique index (enforces 1:1)
- `CoverLetterConversation.coverLetterId` — unique index
