"use client";

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

/**
 * Live product previews (real ResumeFrame + CoverLetterFrame) scaled into the
 * marketing hero — no screenshot asset required.
 */
export function HomeProductPreview() {
  const theme = resumeThemeCssVars(DEMO_PRIMARY_COLOR);

  return (
    <div
      className="home-mock-wrap relative h-full w-full overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[min(82dvh,720px)] w-full max-w-[34rem]">
          {/* Cover letter — back layer */}
          <div className="absolute right-0 top-[2%] z-0 origin-top-right scale-[0.36] rotate-[4deg] sm:scale-[0.4] lg:scale-[0.42]">
            <div className="mb-2 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Cover letter
            </div>
            <div
              className="w-[210mm] overflow-hidden rounded-sm bg-white shadow-[0_28px_70px_-28px_rgba(26,35,50,0.45)] ring-1 ring-black/10"
              style={theme}
            >
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
          </div>

          {/* Resume — front layer */}
          <div className="absolute left-0 top-[6%] z-10 origin-top-left scale-[0.38] -rotate-[2.5deg] sm:scale-[0.42] lg:scale-[0.46]">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Resume
            </div>
            <div
              className="w-[210mm] overflow-hidden rounded-sm bg-white shadow-[0_32px_80px_-24px_rgba(26,35,50,0.5)] ring-1 ring-black/10"
              style={theme}
            >
              <ResumeFrame
                data={DEMO_RESUME}
                templateId="classic"
                locale="en"
                editable={false}
                textEditable={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
