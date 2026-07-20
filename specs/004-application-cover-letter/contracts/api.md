# HTTP API Contracts: Application Detail & Cover Letter Workspace

**Base**: same origin  
**Auth**: session cookie via Auth.js (required)  
**Content-Type**: `application/json` (unless noted)  
**Errors**: `{ "error": { "code": string, "message": string, "details"?: unknown } }`

Existing `/api/applications` and `/api/applications/{applicationId}` CRUD routes remain unchanged.

---

## Application Detail Page (UI route)

### `GET /applications/{applicationId}?tab=information|cover-letter`

Server-rendered detail page. Default tab: `information`.

**Auth**: session required; 404 if not owned.

---

## Cover Letter Content

### `GET /api/applications/{applicationId}/cover-letter`

Returns cover letter for the application, creating an empty one if none exists.

**Response 200**:

```json
{
  "coverLetter": {
    "id": "cl_123",
    "applicationId": "app_123",
    "content": "# Dear Hiring Manager\n\n...",
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  },
  "conversationId": "conv_123"
}
```

**Errors**: `401`, `404`

### `PATCH /api/applications/{applicationId}/cover-letter`

Update cover letter markdown content (manual edit save).

**Body**:

```json
{
  "content": "# Updated cover letter\n\nNew paragraph."
}
```

**Rules**:

- `content` required, max 50,000 chars
- Creates cover letter record if not exists

**Response 200**:

```json
{
  "coverLetter": {
    "id": "cl_123",
    "content": "...",
    "updatedAt": "ISO-8601"
  }
}
```

---

## Cover Letter Chat

### `POST /api/applications/{applicationId}/cover-letter/chat`

AI SDK streaming endpoint for cover letter drafting chat.

**Body** (AI SDK transport shape):

```json
{
  "messages": [
    { "id": "msg_1", "role": "user", "content": "Draft a cover letter for this role" }
  ]
}
```

**Behavior**:

- Loads application + linked resume (if any) for system context
- Streams assistant response
- May include tool call proposing `coverLetterSuggestion` (markdown text)
- Persists full message array on stream end
- Does **not** auto-apply suggestions — client shows confirm UI

**Response**: `text/event-stream` (AI SDK data stream)

### `GET /api/applications/{applicationId}/cover-letter/chat`

Load conversation messages.

**Response 200**:

```json
{
  "id": "conv_123",
  "messages": []
}
```

---

## Apply AI Suggestion

### `POST /api/applications/{applicationId}/cover-letter/apply-suggestion`

Apply a user-confirmed AI cover letter suggestion.

**Body**:

```json
{
  "content": "# Dear Hiring Manager\n\n...",
  "confirmReplace": true
}
```

**Rules**:

- `confirmReplace` must be `true`
- Replaces entire cover letter content

**Response 200**:

```json
{
  "coverLetter": {
    "id": "cl_123",
    "content": "...",
    "updatedAt": "ISO-8601"
  }
}
```

---

## Shared Types

### CoverLetterSuggestion (tool output / client confirm payload)

```json
{
  "content": "markdown string",
  "summary": "Brief description of what changed"
}
```

### ApplicationContext (server-side, not exposed directly)

Built from `JobApplication` + optional linked `MasterResumeProfile.data` for AI system prompt injection.
