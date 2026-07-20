"use client";

import {
  ClassicCoverLetterPreview,
  ModernCoverLetterPreview,
} from "@/components/applications/cover-letter-previews";
import type {
  CoverLetterIdentity,
  CoverLetterMeta,
} from "@/lib/cover-letter/identity";
import type { CoverLetterTemplateId } from "@/lib/cover-letter/templates";

export function CoverLetterFrame({
  content,
  subject,
  identity,
  meta,
  templateId,
  locale,
  primaryColor,
  editable = false,
  profileId,
  onIdentityChange,
}: {
  content: string;
  subject: string;
  identity: CoverLetterIdentity;
  meta: CoverLetterMeta;
  templateId: CoverLetterTemplateId;
  locale: string;
  primaryColor: string;
  editable?: boolean;
  profileId?: string | null;
  onIdentityChange?: (next: CoverLetterIdentity) => void;
}) {
  if (templateId === "modern") {
    return (
      <ModernCoverLetterPreview
        content={content}
        identity={identity}
        meta={meta}
        primaryColor={primaryColor}
        locale={locale}
        subject={subject}
        editable={editable}
        profileId={profileId}
        onIdentityChange={onIdentityChange}
      />
    );
  }

  return (
    <ClassicCoverLetterPreview
      content={content}
      identity={identity}
      meta={meta}
      primaryColor={primaryColor}
      locale={locale}
      subject={subject}
      editable={editable}
      profileId={profileId}
      onIdentityChange={onIdentityChange}
    />
  );
}
