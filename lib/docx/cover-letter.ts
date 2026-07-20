import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableBorders,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertInchesToTwip,
} from "docx";
import type {
  CoverLetterIdentity,
  CoverLetterMeta,
} from "@/lib/cover-letter/identity";
import { coverLetterLabels } from "@/lib/cover-letter/labels";

/** French formal letter style — sans-serif, sender left / recipient right. */
const FONT = "Calibri";
const SIZE_NAME = 24; // 12pt
const SIZE_BODY = 22; // 11pt

const PAGE_WIDTH = convertInchesToTwip(8.27);
const MARGIN_SIDE = convertInchesToTwip(0.9);
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_SIDE * 2;
const COL_GAP = convertInchesToTwip(0.35);
const COL_WIDTH = Math.floor((CONTENT_WIDTH - COL_GAP) / 2);

const NO_BORDER = {
  style: BorderStyle.NIL,
  size: 0,
  color: "auto",
} as const;

function run(
  text: string,
  opts: { bold?: boolean; italics?: boolean; size?: number } = {},
) {
  return new TextRun({
    text,
    font: FONT,
    size: opts.size ?? SIZE_BODY,
    bold: opts.bold,
    italics: opts.italics,
  });
}

function softBreak() {
  return new TextRun({ break: 1 });
}

/** One paragraph with soft line breaks — tight spacing like body text lines. */
function stackedBlock(
  lines: Array<{ text: string; bold?: boolean; size?: number }>,
  align?: (typeof AlignmentType)[keyof typeof AlignmentType],
) {
  const children: TextRun[] = [];
  lines.forEach((item, i) => {
    if (i > 0) children.push(softBreak());
    children.push(
      run(item.text, {
        bold: item.bold,
        size: item.size ?? SIZE_BODY,
      }),
    );
  });
  if (!children.length) children.push(run(""));
  return new Paragraph({
    spacing: { after: 0, before: 0, line: 240 },
    alignment: align,
    children,
  });
}

function empty(after = 0) {
  return new Paragraph({
    spacing: { after, before: 0, line: 240 },
    children: [run("")],
  });
}

/** Minimal markdown → text runs: **bold**, *italic*. */
function markdownRuns(text: string, size = SIZE_BODY): TextRun[] {
  const runs: TextRun[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|`[^`]+`|[^*_`]+)/g;
  const parts = text.match(re) ?? [text];
  for (const part of parts) {
    if (
      (part.startsWith("**") && part.endsWith("**")) ||
      (part.startsWith("__") && part.endsWith("__"))
    ) {
      runs.push(run(part.slice(2, -2), { bold: true, size }));
    } else if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      runs.push(run(part.slice(1, -1), { italics: true, size }));
    } else if (part.startsWith("`") && part.endsWith("`")) {
      runs.push(run(part.slice(1, -1), { size }));
    } else {
      const cleaned = part
        .replace(/^#{1,6}\s+/, "")
        .replace(/^[-*+]\s+/, "")
        .replace(/^\d+\.\s+/, "");
      if (cleaned) runs.push(run(cleaned, { size }));
    }
  }
  return runs.length ? runs : [run("")];
}

function splitLines(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function senderBlock(identity: CoverLetterIdentity): Paragraph[] {
  const lines: Array<{ text: string; bold?: boolean; size?: number }> = [
    { text: identity.fullName, bold: true, size: SIZE_NAME },
  ];
  for (const loc of splitLines(identity.location)) {
    lines.push({ text: loc });
  }
  if (identity.email?.trim()) lines.push({ text: identity.email.trim() });
  if (identity.phone?.trim()) lines.push({ text: identity.phone.trim() });
  return [stackedBlock(lines)];
}

function recipientBlock(meta: CoverLetterMeta): Paragraph[] {
  const org =
    meta.recipientOrganization?.trim() || meta.companyName?.trim() || "";
  const lines: Array<{ text: string; bold?: boolean; size?: number }> = [];
  if (org) lines.push({ text: org, bold: true, size: SIZE_NAME });
  if (meta.recipientName?.trim()) {
    lines.push({ text: meta.recipientName.trim() });
  }
  if (meta.recipientTitle?.trim()) {
    lines.push({ text: meta.recipientTitle.trim() });
  }
  for (const addr of splitLines(meta.recipientAddress)) {
    lines.push({ text: addr });
  }
  if (!lines.length) return [empty()];
  return [stackedBlock(lines, AlignmentType.RIGHT)];
}

function cell(children: Paragraph[], width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      start: NO_BORDER,
      end: NO_BORDER,
    },
    verticalAlign: VerticalAlign.TOP,
    children,
  });
}

export async function renderCoverLetterDocx(opts: {
  content: string;
  subject: string;
  identity: CoverLetterIdentity;
  meta: CoverLetterMeta;
  locale: string;
}): Promise<Buffer> {
  const { content, subject, identity, meta, locale } = opts;
  const labels = coverLetterLabels(locale);
  const children: (Paragraph | Table)[] = [];

  // Header: sender (left) · recipient (right), French formal layout
  children.push(
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [COL_WIDTH, COL_GAP, COL_WIDTH],
      borders: TableBorders.NONE,
      rows: [
        new TableRow({
          children: [
            cell(senderBlock(identity), COL_WIDTH),
            cell([empty()], COL_GAP),
            cell(recipientBlock(meta), COL_WIDTH),
          ],
        }),
      ],
    }),
  );

  children.push(empty(280));

  const subjectLine = subject.trim() || meta.subject?.trim() || "";
  if (subjectLine) {
    children.push(
      new Paragraph({
        spacing: { after: 280, before: 0, line: 276 },
        children: [
          run(`${labels.subject} : `, { bold: true }),
          ...markdownRuns(subjectLine),
        ],
      }),
    );
  }

  const blocks = content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (!blocks.length) {
    children.push(empty());
  } else {
    for (const block of blocks) {
      const text = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join(" ");
      children.push(
        new Paragraph({
          spacing: { after: 200, before: 0, line: 276 },
          children: markdownRuns(text),
        }),
      );
    }
  }

  // Signature — bottom right
  children.push(
    new Paragraph({
      spacing: { after: 0, before: 360, line: 240 },
      alignment: AlignmentType.RIGHT,
      children: [run(identity.fullName, { bold: true, size: SIZE_NAME })],
    }),
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE_BODY },
          paragraph: {
            spacing: { after: 0, before: 0, line: 240 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH,
              height: convertInchesToTwip(11.69),
            },
            margin: {
              top: convertInchesToTwip(0.85),
              bottom: convertInchesToTwip(0.85),
              left: MARGIN_SIDE,
              right: MARGIN_SIDE,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
