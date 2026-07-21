"use client";

import { useEffect, useState } from "react";
import { CoverLetterFrame } from "@/components/applications/cover-letter-frame";
import { ResumeFrame } from "@/components/preview/resume-frame";
import {
  DEMO_COVER_CONTENT,
  DEMO_COVER_IDENTITY,
  DEMO_COVER_META,
  DEMO_COVER_SUBJECT,
  DEMO_PRIMARY_COLOR,
  DEMO_RESUME,
} from "@/lib/marketing/demo-data";
import { resumeThemeCssVars } from "@/lib/resume/theme-color";
import { cn } from "@/lib/utils";

/** A4 CSS px at 96dpi — shell size must match scale or overflow clips a thin strip. */
const SHEET_W = 794;
const SHEET_H = 1123;

function ScaledSheet({
  scale,
  rotate = 0,
  className,
  label,
  labelAlign = "left",
  children,
}: {
  scale: number;
  rotate?: number;
  className?: string;
  label?: string;
  labelAlign?: "left" | "right";
  children: React.ReactNode;
}) {
  const labelH = label ? 18 : 0;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{
        width: SHEET_W * scale,
        height: SHEET_H * scale + labelH,
      }}
    >
      {label ? (
        <p
          className={cn(
            "mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted",
            labelAlign === "right" && "text-right",
          )}
        >
          {label}
        </p>
      ) : null}
      <div
        className="absolute left-0 origin-top-left"
        style={{
          top: labelH,
          width: SHEET_W,
          height: SHEET_H,
          transform: `scale(${scale}) rotate(${rotate}deg)`,
        }}
      >
        <div className="h-full w-full overflow-hidden rounded-sm bg-white shadow-[0_28px_70px_-24px_rgba(26,35,50,0.45)] ring-1 ring-black/10">
          {children}
        </div>
      </div>
    </div>
  );
}

function useWideLayout() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide;
}

function useNarrowScale() {
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Fit width with side padding; leave room for copy above (~42% of height).
      const maxW = Math.min(w - 40, 320);
      const maxH = h * 0.5;
      const byW = maxW / SHEET_W;
      const byH = maxH / SHEET_H;
      setScale(Math.max(0.22, Math.min(byW, byH, 0.4)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return scale;
}

export function HomeProductPreview() {
  const theme = resumeThemeCssVars(DEMO_PRIMARY_COLOR);
  const wide = useWideLayout();
  const narrowScale = useNarrowScale();

  const resume = (
    <div style={theme} className="h-full w-full bg-white">
      <ResumeFrame
        data={DEMO_RESUME}
        templateId="classic"
        locale="en"
        editable={false}
        textEditable={false}
      />
    </div>
  );

  const coverLetter = (
    <div style={theme} className="h-full w-full bg-white">
      <CoverLetterFrame
        content={DEMO_COVER_CONTENT}
        subject={DEMO_COVER_SUBJECT}
        identity={DEMO_COVER_IDENTITY}
        meta={DEMO_COVER_META}
        templateId="classic"
        locale="en"
        primaryColor={DEMO_PRIMARY_COLOR}
        editable={false}
      />
    </div>
  );

  if (!wide) {
    return (
      <div
        className="home-mock-wrap flex h-full w-full items-end justify-center pb-2"
        aria-hidden
      >
        <ScaledSheet scale={narrowScale}>{resume}</ScaledSheet>
      </div>
    );
  }

  return (
    <div
      className="home-mock-wrap relative flex h-full w-full items-center justify-center"
      aria-hidden
    >
      <div className="relative h-full w-full max-w-[36rem]">
        <ScaledSheet
          scale={0.4}
          rotate={3.5}
          label="Cover letter"
          labelAlign="right"
          className="absolute right-[2%] top-[6%] z-0"
        >
          {coverLetter}
        </ScaledSheet>
        <ScaledSheet
          scale={0.44}
          rotate={-2}
          label="Resume"
          className="absolute left-[2%] top-[10%] z-10"
        >
          {resume}
        </ScaledSheet>
      </div>
    </div>
  );
}
