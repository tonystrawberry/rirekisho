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
  WidthType,
  convertInchesToTwip,
} from "docx";
import type { MasterResume } from "@/lib/resume/schema";
import { sectionLabel } from "@/lib/resume/section-labels";

const FONT = "Times New Roman";
const SIZE_NAME = 48; // 24pt
const SIZE_BODY = 22; // 11pt
const SIZE_SECTION = 24; // 12pt
const PAGE_WIDTH_TWIP = convertInchesToTwip(8.5);
/** Classical resumes use tight side margins (~0.5"). */
const MARGIN_SIDE = convertInchesToTwip(0.5);
const MARGIN_VERTICAL = convertInchesToTwip(0.5);
const CONTENT_WIDTH = PAGE_WIDTH_TWIP - MARGIN_SIDE * 2;

type DocChild = Paragraph | Table;

/** `nil` (not `none`) — Pages otherwise draws a default box around tables. */
const NO_BORDER = {
  style: BorderStyle.NIL,
  size: 0,
  color: "auto",
} as const;

const RULE_BORDER = {
  style: BorderStyle.SINGLE,
  size: 18, // 2.25pt
  color: "000000",
  space: 1,
} as const;

function run(
  text: string,
  opts: {
    bold?: boolean;
    italics?: boolean;
    size?: number;
  } = {},
) {
  return new TextRun({
    text,
    font: FONT,
    size: opts.size ?? SIZE_BODY,
    bold: opts.bold,
    italics: opts.italics,
  });
}

function emptyLine() {
  return new Paragraph({
    spacing: { after: 0, before: 0, line: 240 },
    children: [run("")],
  });
}

/**
 * Section title with a full-width bottom rule only (no box).
 * Table cell bottom border — more reliable than paragraph borders in Pages.
 */
function sectionHeading(title: string): DocChild[] {
  return [
    new Paragraph({
      spacing: { before: 200, after: 0 },
      children: [run("")],
    }),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [CONTENT_WIDTH],
      borders: TableBorders.NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: CONTENT_WIDTH, type: WidthType.DXA },
              borders: {
                top: NO_BORDER,
                bottom: RULE_BORDER,
                left: NO_BORDER,
                right: NO_BORDER,
                start: NO_BORDER,
                end: NO_BORDER,
              },
              margins: {
                top: 0,
                bottom: convertInchesToTwip(0.04),
                left: 0,
                right: 0,
              },
              children: [
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    run(title.toUpperCase(), {
                      bold: true,
                      size: SIZE_SECTION,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 80 },
      children: [run("")],
    }),
  ];
}

/** Left text + right-aligned trailing text — 2-col table (tabs break in Google Docs). */
function dualLine(
  left: { text: string; bold?: boolean; italics?: boolean },
  right: { text: string; bold?: boolean; italics?: boolean },
  spacingAfter = 40,
): Table {
  const leftWidth = Math.round(CONTENT_WIDTH * 0.62);
  const rightWidth = CONTENT_WIDTH - leftWidth;

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [leftWidth, rightWidth],
    borders: TableBorders.NONE,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: leftWidth, type: WidthType.DXA },
            borders: {
              top: NO_BORDER,
              bottom: NO_BORDER,
              left: NO_BORDER,
              right: NO_BORDER,
              start: NO_BORDER,
              end: NO_BORDER,
            },
            margins: { top: 0, bottom: 0, left: 0, right: convertInchesToTwip(0.08) },
            children: [
              new Paragraph({
                spacing: { after: spacingAfter, line: 276 },
                children: left.text
                  ? [
                      run(left.text, {
                        bold: left.bold,
                        italics: left.italics,
                      }),
                    ]
                  : [run("")],
              }),
            ],
          }),
          new TableCell({
            width: { size: rightWidth, type: WidthType.DXA },
            borders: {
              top: NO_BORDER,
              bottom: NO_BORDER,
              left: NO_BORDER,
              right: NO_BORDER,
              start: NO_BORDER,
              end: NO_BORDER,
            },
            margins: { top: 0, bottom: 0, left: convertInchesToTwip(0.08), right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: spacingAfter, line: 276 },
                children: right.text
                  ? [
                      run(right.text, {
                        bold: right.bold,
                        italics: right.italics,
                      }),
                    ]
                  : [run("")],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function bullet(text: string) {
  return new Paragraph({
    indent: { left: convertInchesToTwip(0.2) },
    spacing: { after: 40, line: 276 },
    children: [run(`•  ${text}`)],
  });
}

function skillBullet(category: string, names: string) {
  return new Paragraph({
    indent: { left: convertInchesToTwip(0.2) },
    spacing: { after: 40, line: 276 },
    children: [
      run("•  "),
      // Bold category label (Google Docs preserves rPr/b on TextRun)
      new TextRun({
        text: `${category}: `,
        bold: true,
        font: FONT,
        size: SIZE_BODY,
      }),
      run(names),
    ],
  });
}

function formatRange(
  start?: string,
  end?: string,
  current?: boolean,
): string {
  const a = start?.trim() ?? "";
  const b = current ? "Present" : (end?.trim() ?? "");
  if (a && b) return `${a} – ${b}`;
  return a || b;
}

function contactLine(data: MasterResume): string {
  const parts: string[] = [];
  const { identity } = data;
  if (identity.email?.trim()) parts.push(identity.email.trim());
  if (identity.phone?.trim()) parts.push(identity.phone.trim());
  if (identity.location?.trim()) parts.push(identity.location.trim());
  for (const link of identity.links ?? []) {
    const label = link.label?.trim() || link.url;
    if (label) parts.push(label);
  }
  return parts.join("  |  ");
}

const CATEGORY_ORDER = [
  "Languages & Frameworks",
  "Databases & APIs",
  "Cloud & Infrastructure",
  "Tools & Environments",
  "Other",
] as const;

/** Infer a classical skill category when the profile has none set. */
function inferSkillCategory(name: string): (typeof CATEGORY_ORDER)[number] {
  const n = name.toLowerCase();

  if (
    /\b(javascript|typescript|python|java|kotlin|swift|go\b|golang|rust|c\+\+|c#|\bc\b|ruby|php|scala|html|css|tailwind|react|next\.?js|vue|angular|svelte|node\.?js|express|rails|django|spring|flutter|react native|android|ios|\.net)\b/.test(
      n,
    )
  ) {
    return "Languages & Frameworks";
  }

  if (
    /\b(postgres|postgresql|mysql|mariadb|mongodb|redis|dynamodb|sqlite|elasticsearch|graphql|rest(ful)?|api|nginx|gradle|prisma|sql)\b/.test(
      n,
    )
  ) {
    return "Databases & APIs";
  }

  if (
    /\b(aws|amazon|azure|gcp|google cloud|terraform|pulumi|kubernetes|k8s|docker|ecs|eks|lambda|fargate|cloudfront|iam|s3|ec2|vpc|infrastructure|iac|devops|ci\/?cd)\b/.test(
      n,
    )
  ) {
    return "Cloud & Infrastructure";
  }

  if (
    /\b(git|github|gitlab|linux|unix|bash|shell|docker|jenkins|circleci|github actions|vim|vscode|jira|figma|webpack|vite)\b/.test(
      n,
    )
  ) {
    return "Tools & Environments";
  }

  return "Other";
}

function groupSkills(data: MasterResume) {
  const groups = new Map<string, string[]>();
  for (const skill of data.skills) {
    const name = skill.name?.trim();
    if (!name) continue;
    const key =
      skill.category?.trim() || inferSkillCategory(name);
    const list = groups.get(key) ?? [];
    list.push(name);
    groups.set(key, list);
  }

  // Stable classical order, then any custom categories last
  const ordered = new Map<string, string[]>();
  for (const cat of CATEGORY_ORDER) {
    const names = groups.get(cat);
    if (names?.length) ordered.set(cat, names);
  }
  for (const [cat, names] of groups) {
    if (!ordered.has(cat)) ordered.set(cat, names);
  }
  return ordered;
}

function headerBlock(data: MasterResume): DocChild[] {
  const contact = contactLine(data);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: data.identity.fullName || "Your Name",
          bold: true,
          font: FONT,
          size: SIZE_NAME,
        }),
      ],
    }),
    ...(contact
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [run(contact)],
          }),
        ]
      : []),
  ];
}

/**
 * Classical one-column Word resume (Times New Roman, section rules,
 * left titles + right-aligned dates) matching common academic formats.
 */
export async function renderClassicalDocx(
  data: MasterResume,
  locale = "en",
): Promise<Buffer> {
  const children: DocChild[] = [...headerBlock(data)];
  const t = (section: Parameters<typeof sectionLabel>[0]) =>
    sectionLabel(section, locale);

  if (data.summary?.trim()) {
    children.push(...sectionHeading(t("summary")));
    for (const line of data.summary.trim().split(/\n+/)) {
      if (!line.trim()) continue;
      children.push(
        new Paragraph({
          spacing: { after: 60, line: 276 },
          children: [run(line.trim())],
        }),
      );
    }
  }

  if (data.education.length) {
    children.push(...sectionHeading(t("education")));
    for (const ed of data.education) {
      children.push(
        dualLine({ text: ed.institution, bold: true }, { text: "" }),
      );
      const degreeParts = [ed.degree, ed.field].filter(Boolean).join(" – ");
      children.push(
        dualLine(
          { text: degreeParts, italics: true },
          { text: formatRange(ed.startDate, ed.endDate), italics: true },
        ),
      );
      for (const b of ed.bullets ?? []) {
        if (b.trim()) children.push(bullet(b.trim()));
      }
      children.push(emptyLine());
    }
  }

  if (data.experience.length) {
    children.push(...sectionHeading(t("experience")));
    for (const exp of data.experience) {
      children.push(
        dualLine(
          { text: exp.company, bold: true },
          { text: exp.location?.trim() ?? "", bold: true },
        ),
      );
      children.push(
        dualLine(
          { text: exp.title, italics: true },
          {
            text: formatRange(exp.startDate, exp.endDate, exp.current),
            italics: true,
          },
        ),
      );
      for (const b of [...exp.bullets, ...exp.metrics]) {
        if (b.trim()) children.push(bullet(b.trim()));
      }
      children.push(emptyLine());
    }
  }

  if (data.projects.length) {
    children.push(...sectionHeading(t("projects")));
    for (const project of data.projects) {
      const left = project.url?.trim()
        ? `${project.name}  |  ${project.url.trim()}`
        : project.name;
      children.push(
        dualLine({ text: left, bold: true }, { text: "", italics: true }),
      );
      if (project.description?.trim()) {
        children.push(bullet(project.description.trim()));
      }
      if (project.technologies.length) {
        children.push(
          bullet(`Technologies: ${project.technologies.join(", ")}`),
        );
      }
      for (const h of project.highlights) {
        if (h.trim()) children.push(bullet(h.trim()));
      }
      children.push(emptyLine());
    }
  }

  if (data.skills.length) {
    children.push(...sectionHeading(t("technicalSkills")));
    const groups = groupSkills(data);
    for (const [category, names] of groups) {
      children.push(skillBullet(category, names.join(", ")));
    }
  }

  if ((data.certifications ?? []).length) {
    children.push(...sectionHeading(t("certifications")));
    for (const c of data.certifications ?? []) {
      const left = [c.name, c.issuer].filter(Boolean).join(" — ");
      children.push(
        dualLine({ text: left, bold: true }, { text: c.date?.trim() ?? "" }),
      );
    }
  }

  if ((data.references ?? []).length) {
    children.push(...sectionHeading(t("references")));
    for (const r of data.references ?? []) {
      const detail = [r.role, r.company, r.email].filter(Boolean).join(" · ");
      children.push(
        new Paragraph({
          spacing: { after: 40, line: 276 },
          children: [
            run(r.name, { bold: true }),
            ...(detail ? [run(` — ${detail}`)] : []),
          ],
        }),
      );
    }
  }

  if ((data.hobbies ?? []).length) {
    children.push(...sectionHeading(t("hobbies")));
    for (const h of data.hobbies ?? []) {
      children.push(
        new Paragraph({
          spacing: { after: 40, line: 276 },
          children: [
            run("•  "),
            run(h.name, { bold: true }),
            ...(h.description?.trim()
              ? [run(` — ${h.description.trim()}`)]
              : []),
          ],
        }),
      );
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE_BODY },
          paragraph: {
            spacing: { line: 276 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH_TWIP,
              height: convertInchesToTwip(11),
            },
            margin: {
              top: MARGIN_VERTICAL,
              bottom: MARGIN_VERTICAL,
              left: MARGIN_SIDE,
              right: MARGIN_SIDE,
            },
          },
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
