import type { ResumeLocaleId } from "@/lib/resume/locales";

export type CoverLetterUiLabels = {
  attentionOf: string;
  from: string;
  date: string;
  followMe: string;
  letterTitle: string;
  subject: string;
  recipientPlaceholder: string;
};

const LABELS: Record<ResumeLocaleId, CoverLetterUiLabels> = {
  en: {
    attentionOf: "To the attention of",
    from: "From",
    date: "Date",
    followMe: "Follow me",
    letterTitle: "Cover letter",
    subject: "Subject",
    recipientPlaceholder: "Add recipient above",
  },
  fr: {
    attentionOf: "À l'attention de",
    from: "De la part de",
    date: "Date",
    followMe: "Suivez-moi",
    letterTitle: "Lettre de motivation",
    subject: "Objet",
    recipientPlaceholder: "Ajoutez le destinataire ci-dessus",
  },
  ja: {
    attentionOf: "宛先",
    from: "差出人",
    date: "日付",
    followMe: "リンク",
    letterTitle: "カバーレター",
    subject: "件名",
    recipientPlaceholder: "宛先を入力してください",
  },
};

export function coverLetterLabels(
  locale: string | null | undefined,
): CoverLetterUiLabels {
  if (locale === "fr" || locale === "ja" || locale === "en") {
    return LABELS[locale];
  }
  return LABELS.en;
}
