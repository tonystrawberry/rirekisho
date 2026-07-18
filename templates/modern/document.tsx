import React from "react";
import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";
import type { MasterResume } from "@/lib/resume/schema";
import { formatSkillWithProficiency } from "@/lib/resume/skill-proficiency";
import { sectionLabel } from "@/lib/resume/section-labels";

const styles = StyleSheet.create({
  page: { padding: 0, fontSize: 10, fontFamily: "Helvetica", color: "#1a2332" },
  header: {
    backgroundColor: "#0f6e56",
    color: "#fff",
    padding: 28,
    flexDirection: "row",
    alignItems: "center",
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    objectFit: "cover",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.45)",
    marginRight: 16,
  },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#fff" },
  headline: { fontSize: 11, color: "#f4fbf8", marginTop: 4 },
  meta: { fontSize: 9, color: "#d7ebe3", marginTop: 6 },
  body: { padding: 28 },
  section: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 11,
    color: "#0f6e56",
    fontFamily: "Helvetica-Bold",
  },
  itemRow: { flexDirection: "row", marginTop: 8 },
  logo: { width: 20, height: 20, objectFit: "contain", marginRight: 8, marginTop: 1 },
  itemBody: { flexGrow: 1 },
  itemTitle: { fontFamily: "Helvetica-Bold" },
  muted: { fontSize: 9, color: "#5c6b7a", marginTop: 2 },
  bullet: { marginLeft: 10, marginTop: 2 },
});

export function ModernDocument({
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
        <View style={styles.header}>
          {photoSrc ? <Image src={photoSrc} style={styles.photo} /> : null}
          <View>
            <Text style={styles.name}>{data.identity.fullName}</Text>
            {data.identity.headline ? (
              <Text style={styles.headline}>{data.identity.headline}</Text>
            ) : null}
            <Text style={styles.meta}>
              {[data.identity.email, data.identity.location]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        </View>
        <View style={styles.body}>
          {data.summary ? (
            <>
              <Text style={styles.section}>{sectionLabel("profile", locale)}</Text>
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
                    {exp.title} @ {exp.company}
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
                      </Text>
                      {ed.field ? (
                        <Text style={styles.muted}>{ed.field}</Text>
                      ) : null}
                      {[ed.startDate, ed.endDate].filter(Boolean).length ? (
                        <Text style={styles.muted}>
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
          {data.skills.map((s) => (
            <Text key={s.id} style={{ marginTop: 3 }}>
              {formatSkillWithProficiency(s, locale)}
            </Text>
          ))}
          {(data.certifications ?? []).length ? (
            <>
              <Text style={styles.section}>{sectionLabel("certifications", locale)}</Text>
              {(data.certifications ?? []).map((c) => (
                <Text key={c.id} style={{ marginTop: 3 }}>
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
                    <Text style={styles.muted}>
                      {[r.role, r.company].filter(Boolean).join(" · ")}
                    </Text>
                  ) : null}
                  {r.email ? <Text style={styles.muted}>{r.email}</Text> : null}
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
        </View>
      </Page>
    </Document>
  );
}
