import React from "react";
import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";
import type { MasterResume } from "@/lib/resume/schema";
import { groupSkillNamesByCategory } from "@/lib/resume/skill-categories";
import { sectionLabel } from "@/lib/resume/section-labels";
import { formatIdentityLinksForMeta } from "@/lib/resume/identity-links";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a2332" },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    objectFit: "cover",
    marginRight: 12,
  },
  headerText: { flexGrow: 1 },
  name: { fontSize: 18, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  headline: { fontSize: 11, marginBottom: 4, color: "#1a2332" },
  meta: { fontSize: 9, color: "#5c6b7a", marginBottom: 4 },
  section: { marginTop: 12, marginBottom: 4, fontSize: 12, fontFamily: "Helvetica-Bold" },
  itemRow: { flexDirection: "row", marginTop: 8 },
  logo: { width: 22, height: 22, objectFit: "contain", marginRight: 8, marginTop: 2 },
  itemBody: { flexGrow: 1 },
  itemTitle: { fontFamily: "Helvetica-Bold" },
  bullet: { marginLeft: 10, marginTop: 2 },
});

export function ClassicDocument({
  data,
  locale = "en",
  photoSrc,
  logoSrcById,
}: {
  data: MasterResume;
  locale?: string;
  photoSrc?: string;
  logoSrcById?: Record<string, string>;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {photoSrc ? <Image src={photoSrc} style={styles.photo} /> : null}
          <View style={styles.headerText}>
            <Text style={styles.name}>{data.identity.fullName}</Text>
            {data.identity.headline ? (
              <Text style={styles.headline}>{data.identity.headline}</Text>
            ) : null}
            <Text style={styles.meta}>
              {[
                data.identity.email,
                data.identity.phone,
                data.identity.location,
                ...formatIdentityLinksForMeta(data.identity.links),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        </View>
        {data.summary ? (
          <>
            <Text style={styles.section}>{sectionLabel("summary", locale)}</Text>
            {data.summary.split(/\n/).map((line, i) => (
              <Text key={i} style={i > 0 ? { marginTop: 4 } : undefined}>
                {line || " "}
              </Text>
            ))}
          </>
        ) : null}
        <Text style={styles.section}>{sectionLabel("experience", locale)}</Text>
        {data.experience.map((exp) => {
          const logo = logoSrcById?.[exp.id];
          return (
            <View key={exp.id} style={styles.itemRow} wrap={false}>
              {logo ? <Image src={logo} style={styles.logo} /> : null}
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle}>
                  {exp.title} — {exp.company}
                </Text>
                {exp.location ? (
                  <Text style={styles.meta}>{exp.location}</Text>
                ) : null}
                <Text style={styles.meta}>
                  {[exp.startDate, exp.endDate || (exp.current ? "Present" : "")]
                    .filter(Boolean)
                    .join(" – ")}
                </Text>
                {[...exp.bullets, ...exp.metrics].map((b, i) => (
                  <Text key={i} style={styles.bullet}>
                    • {b}
                  </Text>
                ))}
              </View>
            </View>
          );
        })}
        {data.education.length ? (
          <>
            <Text style={styles.section}>{sectionLabel("education", locale)}</Text>
            {data.education.map((ed) => {
              const logo = logoSrcById?.[ed.id];
              return (
                <View key={ed.id} style={styles.itemRow} wrap={false}>
                  {logo ? <Image src={logo} style={styles.logo} /> : null}
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle}>
                      {ed.institution}
                      {ed.degree ? ` — ${ed.degree}` : ""}
                      {ed.field ? `, ${ed.field}` : ""}
                    </Text>
                    {ed.location ? (
                      <Text style={styles.meta}>{ed.location}</Text>
                    ) : null}
                    {[ed.startDate, ed.endDate].filter(Boolean).length ? (
                      <Text style={styles.meta}>
                        {[ed.startDate, ed.endDate].filter(Boolean).join(" – ")}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </>
        ) : null}
        <Text style={styles.section}>{sectionLabel("skills", locale)}</Text>
        {Array.from(groupSkillNamesByCategory(data.skills, locale)).map(
          ([category, names]) => (
            <Text key={category} style={{ marginTop: 3 }}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{category}: </Text>
              {names.join(" · ")}
            </Text>
          ),
        )}
        {data.projects.length ? (
          <>
            <Text style={styles.section}>{sectionLabel("projects", locale)}</Text>
            {data.projects.map((p) => (
              <View key={p.id}>
                <View style={styles.itemRow} wrap={false}>
                  {logoSrcById?.[p.id] ? (
                    <Image src={logoSrcById[p.id]} style={styles.logo} />
                  ) : null}
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle}>{p.name}</Text>
                    {p.url ? <Text style={styles.meta}>{p.url}</Text> : null}
                    {p.description ? <Text>{p.description}</Text> : null}
                    {p.technologies.length ? (
                      <Text style={styles.meta}>
                        {p.technologies.join(" · ")}
                      </Text>
                    ) : null}
                    {p.highlights.map((h, i) => (
                      <Text key={i} style={styles.bullet}>
                        • {h}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </>
        ) : null}
        {(data.certifications ?? []).length ? (
          <>
            <Text style={styles.section}>{sectionLabel("certifications", locale)}</Text>
            {(data.certifications ?? []).map((c) => (
              <Text key={c.id} style={{ marginTop: 2 }}>
                {c.name}
                {c.issuer ? ` — ${c.issuer}` : ""}
                {c.date ? ` (${c.date})` : ""}
              </Text>
            ))}
          </>
        ) : null}
        {(data.references ?? []).length ? (
          <>
            <Text style={styles.section}>{sectionLabel("references", locale)}</Text>
            {(data.references ?? []).map((r) => (
              <View key={r.id} style={{ marginTop: 4 }}>
                <Text style={styles.itemTitle}>{r.name}</Text>
                {[r.role, r.company].filter(Boolean).length ? (
                  <Text style={styles.meta}>
                    {[r.role, r.company].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}
                {r.email ? <Text style={styles.meta}>{r.email}</Text> : null}
              </View>
            ))}
          </>
        ) : null}
        {(data.hobbies ?? []).length ? (
          <>
            <Text style={styles.section}>{sectionLabel("hobbies", locale)}</Text>
            {(data.hobbies ?? []).map((h) => (
              <Text key={h.id} style={{ marginTop: 2 }}>
                {h.name}
                {h.description ? ` — ${h.description}` : ""}
              </Text>
            ))}
          </>
        ) : null}
      </Page>
    </Document>
  );
}
