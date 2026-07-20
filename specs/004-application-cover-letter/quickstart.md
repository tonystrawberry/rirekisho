# Quickstart: Application Detail & Cover Letter Workspace

**Feature**: `004-application-cover-letter`  
**Branch**: `004-application-cover-letter`  
**Date**: 2026-07-20

## Prerequisites

- Node.js 20+
- `DATABASE_URL` configured
- Existing auth + applications feature (003) working
- `GOOGLE_GENERATIVE_AI_API_KEY` for AI chat (optional — offline fallback if missing)

## 1. Apply migration

```bash
npx prisma migrate dev
npx prisma generate
```

Confirm `CoverLetter` and `CoverLetterConversation` models exist in `prisma/schema.prisma`.

## 2. Run dev server

```bash
npm run dev
```

## 3. Smoke test — Navigation

1. Sign in and open `/applications`.
2. Click an application row → should navigate to `/applications/{id}`.
3. Verify two tabs: **Information** and **Cover Letter**.
4. Verify edit modal no longer appears on list page.

## 4. Smoke test — Information tab

1. On `/applications/{id}?tab=information`, edit title and status.
2. Save → reload page → changes persist.
3. Open `/applications` → list reflects updated title/status.

## 5. Smoke test — Cover Letter tab

1. Open `/applications/{id}?tab=cover-letter`.
2. Verify split layout: chat left, editor/preview right.
3. Type markdown in editor (e.g., `**bold**`, `- item`) → preview renders formatted text.
4. Ask chat to draft a cover letter → suggestion appears → confirm → editor updates.
5. Leave and return → content and chat history restored.

## 6. Smoke test — API

- `GET /api/applications/{id}/cover-letter` → returns content
- `PATCH /api/applications/{id}/cover-letter` → saves manual edits
- `GET /api/applications/{id}/cover-letter/chat` → returns messages
- `POST /api/applications/{id}/cover-letter/chat` → streams response

## 7. Edge verification

- Application with no linked resume → cover letter chat still works
- Access another user's application URL → 404
- Delete application from detail page → redirects to list, cover letter gone
- Unsaved Information tab changes → warning on tab switch
