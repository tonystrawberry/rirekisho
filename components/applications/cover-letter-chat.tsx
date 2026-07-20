"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractCoverLetterSuggestion } from "@/lib/ai/cover-letter-chat";
import { cn } from "@/lib/utils";

type MessageLike = {
  id: string;
  role: string;
  content: string;
};

function messageText(m: {
  content?: string;
  parts?: Array<{ type?: string; text?: string }>;
}) {
  if (typeof m.content === "string" && m.content.length > 0) return m.content;
  if (Array.isArray(m.parts)) {
    return m.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("");
  }
  return "";
}

export function CoverLetterChat({
  applicationId,
  chatId,
  initialMessages,
  currentContent,
  onSuggestionApplied,
}: {
  applicationId: string;
  chatId: string;
  initialMessages: MessageLike[];
  currentContent: string;
  onSuggestionApplied: (content: string) => void;
}) {
  const { messages, input, setInput, handleSubmit, isLoading, error, setMessages } =
    useChat({
      id: chatId,
      api: `/api/applications/${applicationId}/cover-letter/chat`,
      body: { currentContent },
      initialMessages: initialMessages.map((m, i) => ({
        id: m.id?.trim() ? m.id : `${chatId}-${m.role}-${i}`,
        role: m.role as "user" | "assistant" | "system" | "data",
        content: m.content,
      })),
    });

  const latestSuggestion = useMemo(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant) return null;
    return extractCoverLetterSuggestion(messageText(lastAssistant));
  }, [messages]);

  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestionKey = latestSuggestion
    ? latestSuggestion.kind === "patch"
      ? `patch:${latestSuggestion.summary}:${latestSuggestion.find.slice(0, 40)}`
      : `full:${latestSuggestion.summary}:${latestSuggestion.content.slice(0, 40)}`
    : null;
  const showSuggestion =
    latestSuggestion && suggestionKey && suggestionKey !== dismissedKey;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, latestSuggestion, isLoading]);

  async function dismissSuggestionOnServer() {
    const res = await fetch(
      `/api/applications/${applicationId}/cover-letter/chat`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss-suggestion" }),
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return;
    if (Array.isArray(json.messages)) {
      setMessages(
        json.messages.map(
          (
            m: { id?: string; role: string; content: string },
            i: number,
          ) => ({
            id: m.id?.trim() ? m.id : `${chatId}-${m.role}-${i}`,
            role: m.role as "user" | "assistant" | "system" | "data",
            content: m.content,
          }),
        ),
      );
    }
  }

  async function rejectSuggestion() {
    if (!suggestionKey) return;
    setDismissedKey(suggestionKey);
    setApplyError(null);
    try {
      await dismissSuggestionOnServer();
    } catch {
      // Local dismiss already applied; refresh would still show until retry
    }
  }

  async function applySuggestion() {
    if (!latestSuggestion) return;
    setApplyBusy(true);
    setApplyError(null);
    try {
      const payload =
        latestSuggestion.kind === "patch"
          ? {
              mode: "patch" as const,
              find: latestSuggestion.find,
              replace: latestSuggestion.replace,
              confirmReplace: true as const,
            }
          : {
              mode: "full" as const,
              content: latestSuggestion.content,
              confirmReplace: true as const,
            };

      const res = await fetch(
        `/api/applications/${applicationId}/cover-letter/apply-suggestion`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApplyError(json.error?.message || "Failed to apply suggestion");
        return;
      }
      onSuggestionApplied(json.coverLetter.content as string);
      setDismissedKey(suggestionKey);
      await dismissSuggestionOnServer();
    } catch {
      setApplyError("Network error");
    } finally {
      setApplyBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-20rem)] max-h-[calc(100dvh-20rem)] min-h-[16rem] flex-col overflow-hidden rounded-xl border border-border bg-card xl:h-[calc(100dvh-10rem)] xl:max-h-[calc(100dvh-10rem)]">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted">
            Ask the assistant to draft or refine parts of your cover letter.
          </p>
        ) : null}
        {messages.map((m, i) => {
          const text = messageText(m);
          if (!text.trim() && m.role !== "assistant") return null;
          return (
            <div
              key={m.id?.trim() ? m.id : `${chatId}-${m.role}-${i}`}
              className={
                m.role === "user"
                  ? "ml-8 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground"
                  : "mr-8 rounded-lg bg-surface px-3 py-2 text-sm"
              }
            >
              <div
                className={cn(
                  "chat-md max-w-none [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
                  "[&_strong]:font-semibold [&_em]:italic [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
                  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5",
                  "[&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs",
                  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/10 [&_pre]:p-2",
                  "[&_a]:underline",
                  m.role === "user" &&
                    "[&_code]:bg-white/20 [&_pre]:bg-white/15",
                )}
              >
                {text.trim() ? (
                  <ReactMarkdown>{text}</ReactMarkdown>
                ) : (
                  <p>{isLoading ? "Thinking…" : "(empty reply)"}</p>
                )}
              </div>
            </div>
          );
        })}
        {error ? (
          <div className="rounded-lg border border-danger/40 bg-card px-3 py-2 text-sm text-danger">
            {error.message || String(error)}
          </div>
        ) : null}
      </div>

      {showSuggestion && latestSuggestion ? (
        <div className="shrink-0 border-t border-border bg-surface px-4 py-3">
          <p className="text-sm font-medium">
            {latestSuggestion.kind === "patch"
              ? "Suggested edit"
              : "Suggested full draft"}
          </p>
          <p className="mt-1 text-xs text-muted">{latestSuggestion.summary}</p>
          {latestSuggestion.kind === "patch" ? (
            <div className="mt-2 max-h-48 space-y-2 overflow-auto text-xs">
              <div className="rounded border border-rose-200 bg-rose-50 p-2 whitespace-pre-wrap text-rose-900">
                <p className="mb-1 font-semibold uppercase tracking-wide">
                  − Remove
                </p>
                {latestSuggestion.find}
              </div>
              <div className="rounded border border-emerald-200 bg-emerald-50 p-2 whitespace-pre-wrap text-emerald-900">
                <p className="mb-1 font-semibold uppercase tracking-wide">
                  + Add
                </p>
                {latestSuggestion.replace}
              </div>
            </div>
          ) : (
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-card p-2 text-xs whitespace-pre-wrap">
              {latestSuggestion.content}
            </pre>
          )}
          {applyError ? (
            <p className="mt-2 text-sm text-danger">{applyError}</p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => void applySuggestion()}
              disabled={applyBusy}
            >
              {applyBusy ? "Applying…" : "Confirm & apply"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void rejectSuggestion()}
              disabled={applyBusy}
            >
              Reject
            </Button>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-end gap-2 border-t border-border p-3"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask to refine a paragraph or draft a letter…"
          disabled={isLoading}
          rows={2}
          className="min-h-[2.5rem] max-h-40 resize-y"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!isLoading && input.trim()) {
                handleSubmit(e as unknown as FormEvent<HTMLFormElement>);
              }
            }
          }}
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
