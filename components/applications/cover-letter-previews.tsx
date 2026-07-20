"use client";

import ReactMarkdown from "react-markdown";
import type {
  CoverLetterIdentity,
  CoverLetterMeta,
} from "@/lib/cover-letter/identity";
import { coverLetterLabels } from "@/lib/cover-letter/labels";
import {
  DEFAULT_PRIMARY_COLOR,
  normalizePrimaryColor,
  resumeThemeCssVars,
} from "@/lib/resume/theme-color";
import type { ResumeLocaleId } from "@/lib/resume/locales";

function Photo({
  url,
  name,
  size = "md",
  tone = "dark",
}: {
  url?: string;
  name: string;
  size?: "sm" | "md" | "lg";
  tone?: "dark" | "light";
}) {
  const sizeClass =
    size === "lg" ? "h-24 w-24" : size === "sm" ? "h-14 w-14" : "h-20 w-20";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={`${sizeClass} rounded-full object-cover ${
          tone === "dark" ? "ring-2 ring-white/30" : "ring-2 ring-neutral-200"
        }`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full text-sm font-semibold tracking-wide ${
        tone === "dark"
          ? "bg-white/15 text-white"
          : "bg-neutral-200 text-neutral-600"
      }`}
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}

function LetterBody({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <p className="text-sm text-neutral-400 italic">
        Votre lettre de motivation apparaîtra ici.
      </p>
    );
  }
  return (
    <div className="cover-letter-md max-w-full space-y-5 overflow-hidden text-[13px] leading-relaxed break-words text-neutral-700 [overflow-wrap:anywhere] [&_*]:max-w-full [&_*]:break-words [&_h1]:mb-3 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-neutral-900 [&_h2]:mb-3 [&_h2]:text-sm [&_h2]:font-semibold [&_p]:my-0 [&_p+p]:mt-5 [&_pre]:overflow-x-auto [&_strong]:font-semibold [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_li+li]:mt-1.5">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function SubjectLine({
  label,
  subject,
  labelClassName,
  className,
}: {
  label: string;
  subject: string;
  labelClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={
        className ??
        "text-sm text-neutral-800 [&_a]:underline [&_em]:italic [&_strong]:font-semibold"
      }
    >
      <span className={labelClassName}>{label}:</span>{" "}
      <ReactMarkdown
        components={{
          p: ({ children }) => <span>{children}</span>,
        }}
      >
        {subject}
      </ReactMarkdown>
    </div>
  );
}

function formatDate(value: string | null | undefined, locale: string) {
  const d = value ? new Date(value) : new Date();
  const tag = locale === "ja" ? "ja-JP" : locale === "fr" ? "fr-FR" : "en-US";
  if (Number.isNaN(d.getTime())) {
    return (
      value ||
      new Date().toLocaleDateString(tag, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }
  return d.toLocaleDateString(tag, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function linkLabel(link: { label?: string; url: string }) {
  if (link.label?.trim()) return link.label;
  try {
    const host = new URL(link.url).hostname.replace(/^www\./, "");
    if (host.includes("linkedin")) return "LinkedIn";
    if (host.includes("twitter") || host.includes("x.com")) return "Twitter";
    if (host.includes("github")) return "GitHub";
    return host;
  } catch {
    return link.url;
  }
}

function SidebarHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-bold tracking-[0.16em] uppercase opacity-100">
      {children}
    </h2>
  );
}

function recipientLines(meta: CoverLetterMeta) {
  const organization =
    meta.recipientOrganization?.trim() || meta.companyName?.trim() || null;
  return {
    name: meta.recipientName?.trim() || null,
    title: meta.recipientTitle?.trim() || null,
    email: meta.recipientEmail?.trim() || null,
    organization,
    address: meta.recipientAddress?.trim() || null,
    fallbackJob: meta.jobTitle?.trim() || null,
  };
}

function RecipientNameTitle({
  name,
  title,
  nameClassName,
}: {
  name: string | null;
  title: string | null;
  nameClassName?: string;
}) {
  if (!name && !title) return null;
  if (name && title) {
    return (
      <p>
        <span className={nameClassName}>{name}</span>
        <span aria-hidden="true"> — </span>
        <span>{title}</span>
      </p>
    );
  }
  return (
    <p className={name ? nameClassName : undefined}>{name || title}</p>
  );
}

export function ClassicCoverLetterPreview({
  content,
  identity,
  meta,
  primaryColor = DEFAULT_PRIMARY_COLOR,
  locale = "en",
  subject = "",
}: {
  content: string;
  identity: CoverLetterIdentity;
  meta: CoverLetterMeta;
  primaryColor?: string;
  locale?: ResumeLocaleId | string;
  subject?: string;
}) {
  const labels = coverLetterLabels(locale);
  const contactBits = [
    identity.location,
    identity.phone,
    identity.email,
  ].filter(Boolean);
  const recipient = recipientLines(meta);
  const color =
    normalizePrimaryColor(primaryColor) ?? DEFAULT_PRIMARY_COLOR;
  const subjectLine = subject.trim() || meta.subject?.trim() || "";

  return (
    <article
      className="w-full overflow-hidden bg-white text-neutral-900"
      style={resumeThemeCssVars(color)}
    >
      <header className="flex items-start gap-4 border-b border-neutral-200 px-6 py-5">
        <Photo
          url={identity.photoUrl}
          name={identity.fullName}
          size="md"
          tone="light"
        />
        <div className="min-w-0 flex-1">
          <h1 className="cover-letter-theme-accent text-2xl font-semibold tracking-tight uppercase">
            {identity.fullName}
          </h1>
          {identity.headline ? (
            <p className="mt-0.5 text-sm text-neutral-500">{identity.headline}</p>
          ) : null}
          {contactBits.length ? (
            <p className="mt-2 text-xs text-neutral-500">
              {contactBits.join(" · ")}
            </p>
          ) : null}
          {identity.links?.length ? (
            <p className="mt-1 text-xs text-neutral-500">
              {identity.links.map((l) => linkLabel(l)).join(" · ")}
            </p>
          ) : null}
        </div>
      </header>

      <div className="space-y-5 px-6 py-5">
        <div className="grid gap-4 text-xs text-neutral-600 sm:grid-cols-2">
          <div>
            <p className="cover-letter-theme-accent font-bold tracking-[0.12em] uppercase">
              {labels.attentionOf}
            </p>
            <div className="mt-1.5 space-y-0.5 leading-snug">
              <RecipientNameTitle
                name={recipient.name}
                title={recipient.title}
                nameClassName="font-medium text-neutral-900"
              />
              {recipient.email ? <p>{recipient.email}</p> : null}
              {recipient.organization ? <p>{recipient.organization}</p> : null}
              {recipient.address
                ? recipient.address.split("\n").map((line) => (
                    <p key={line}>{line}</p>
                  ))
                : null}
              {!recipient.name &&
              !recipient.title &&
              !recipient.email &&
              !recipient.organization &&
              !recipient.address ? (
                <p className="text-neutral-400 italic">
                  {labels.recipientPlaceholder}
                </p>
              ) : null}
            </div>
          </div>
          <div>
            <p className="cover-letter-theme-accent font-bold tracking-[0.12em] uppercase">
              {labels.from}
            </p>
            <div className="mt-1.5 space-y-0.5 leading-snug">
              <p className="font-medium text-neutral-900">{identity.fullName}</p>
              {identity.headline ? <p>{identity.headline}</p> : null}
            </div>
            <p className="cover-letter-theme-accent mt-3 font-bold tracking-[0.12em] uppercase">
              {labels.date}
            </p>
            <p className="mt-1.5">{formatDate(meta.letterDate, locale)}</p>
          </div>
        </div>

        {subjectLine ? (
          <SubjectLine
            label={labels.subject}
            subject={subjectLine}
            labelClassName="cover-letter-theme-accent font-bold tracking-[0.08em] uppercase"
          />
        ) : null}

        <LetterBody content={content} />
        <div className="pt-2 pb-1">
          <p className="font-serif text-2xl italic text-neutral-800">
            {identity.fullName}
          </p>
        </div>
      </div>
    </article>
  );
}

export function ModernCoverLetterPreview({
  content,
  identity,
  meta,
  primaryColor = DEFAULT_PRIMARY_COLOR,
  locale = "en",
  subject = "",
}: {
  content: string;
  identity: CoverLetterIdentity;
  meta: CoverLetterMeta;
  primaryColor?: string;
  locale?: ResumeLocaleId | string;
  subject?: string;
}) {
  const labels = coverLetterLabels(locale);
  const recipient = recipientLines(meta);
  const hasRecipient =
    recipient.name ||
    recipient.title ||
    recipient.email ||
    recipient.organization ||
    recipient.address;
  const color =
    normalizePrimaryColor(primaryColor) ?? DEFAULT_PRIMARY_COLOR;
  const subjectLine = subject.trim() || meta.subject?.trim() || "";

  return (
    <article
      className="flex w-full overflow-hidden bg-white text-neutral-900"
      style={resumeThemeCssVars(color)}
    >
      <aside className="cover-letter-theme-sidebar w-[30%] shrink-0 space-y-5 px-4 py-7">
        <div className="flex justify-center">
          <Photo url={identity.photoUrl} name={identity.fullName} size="lg" />
        </div>

        <section className="space-y-2 border-t border-white/25 pt-4">
          <SidebarHeading>{labels.attentionOf}</SidebarHeading>
          <div className="space-y-0.5 text-[11px] leading-snug opacity-90">
            <RecipientNameTitle
              name={recipient.name}
              title={recipient.title}
              nameClassName="font-semibold opacity-100"
            />
            {recipient.email ? (
              <p className="break-all">{recipient.email}</p>
            ) : null}
            {recipient.organization ? <p>{recipient.organization}</p> : null}
            {recipient.address
              ? recipient.address.split("\n").map((line) => (
                  <p key={line}>{line}</p>
                ))
              : null}
            {!hasRecipient ? (
              <p className="opacity-50 italic">{labels.recipientPlaceholder}</p>
            ) : null}
          </div>
        </section>

        <section className="space-y-2 border-t border-white/25 pt-4">
          <SidebarHeading>{labels.from}</SidebarHeading>
          <div className="space-y-0.5 text-[11px] leading-snug opacity-90">
            <p className="font-semibold opacity-100">{identity.fullName}</p>
            {identity.headline ? <p>{identity.headline}</p> : null}
          </div>
        </section>

        <section className="space-y-2 border-t border-white/25 pt-4">
          <SidebarHeading>{labels.date}</SidebarHeading>
          <p className="text-[11px] opacity-90">
            {formatDate(meta.letterDate, locale)}
          </p>
        </section>

        {identity.links?.length ? (
          <section className="space-y-2 border-t border-white/25 pt-4">
            <SidebarHeading>{labels.followMe}</SidebarHeading>
            <ul className="space-y-1.5 text-[11px] leading-snug opacity-90">
              {identity.links.map((link) => (
                <li key={link.url} className="break-all">
                  <span className="font-semibold opacity-100">
                    {linkLabel(link)}:
                  </span>{" "}
                  {link.url}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </aside>

      <div className="min-w-0 flex-1 px-7 py-7">
        <header className="mb-6 flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
          <div className="min-w-0">
            <h1 className="cover-letter-theme-accent text-xl font-bold tracking-wide uppercase">
              {identity.fullName}
            </h1>
            {identity.headline ? (
              <p className="mt-0.5 text-xs tracking-wide text-neutral-400 uppercase">
                {identity.headline}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 space-y-1.5 text-right text-[11px] text-neutral-500">
            {identity.location ? (
              <p className="border-b border-neutral-100 pb-1">
                {identity.location}
              </p>
            ) : null}
            {identity.phone ? (
              <p className="border-b border-neutral-100 pb-1">{identity.phone}</p>
            ) : null}
            {identity.email ? <p>{identity.email}</p> : null}
          </div>
        </header>

        <h2 className="cover-letter-theme-accent mb-3 text-sm font-bold tracking-[0.12em] uppercase">
          {labels.letterTitle}
        </h2>

        {subjectLine ? (
          <SubjectLine
            label={labels.subject}
            subject={subjectLine}
            className="mb-4 text-sm text-neutral-800 [&_a]:underline [&_em]:italic [&_strong]:font-semibold"
            labelClassName="font-semibold"
          />
        ) : null}

        <LetterBody content={content} />

        <div className="mt-8">
          <p className="font-serif text-2xl italic text-neutral-700">
            {identity.fullName}
          </p>
          <p className="mt-1 text-xs text-neutral-500">{identity.fullName}</p>
        </div>
      </div>
    </article>
  );
}
