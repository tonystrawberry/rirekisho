"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
/** Matches Tailwind gap-3 between pages */
const PAGE_GAP_PX = 12;
/**
 * Inner top/bottom breathing room on each A4 sheet so clipped content
 * never sits flush against the page edge (especially continued pages).
 */
const PAGE_PAD_MM = 10;
/** CSS reference px/mm — identical on server + first client render. */
const MM_TO_PX = 96 / 25.4;

function estimateMm(mm: number): number {
  return mm * MM_TO_PX;
}

function measureMm(mm: number): number {
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.height = `${mm}mm`;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return px;
}

/**
 * Page start offsets (px) that avoid splitting [data-resume-block] when possible.
 * Falls back to hard cuts (using usable height with padding) only for oversized blocks.
 *
 * Important: starts may be closer than a full page when a section is moved to the
 * next sheet — the renderer clips each page to [start, nextStart) so content is
 * not duplicated across the fold.
 */
function computePageStarts(
  contentEl: HTMLElement,
  pageHeightPx: number,
  padTopPx: number,
  padBottomPx: number,
): number[] {
  const total = contentEl.scrollHeight;
  /** First page: template already pads the top of the article. */
  const usableFirst = pageHeightPx - padBottomPx;
  const usableLater = pageHeightPx - padTopPx - padBottomPx;

  if (total <= usableFirst + 1) return [0];

  const blocks = Array.from(
    contentEl.querySelectorAll<HTMLElement>("[data-resume-block]"),
  );

  if (!blocks.length) {
    const starts = [0];
    let y = usableFirst;
    while (y < total) {
      starts.push(Math.round(y));
      y += usableLater;
    }
    return starts;
  }

  const starts = [0];
  let pageStart = 0;
  let pageIndex = 0;

  const usable = () => (pageIndex === 0 ? usableFirst : usableLater);

  const pushStart = (y: number) => {
    const rounded = Math.max(0, Math.round(y));
    if (rounded - pageStart < 2) return;
    if (starts[starts.length - 1] === rounded) return;
    starts.push(rounded);
    pageStart = rounded;
    pageIndex += 1;
  };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    const top = block.offsetTop;
    const bottom = top + block.offsetHeight;
    const limit = pageStart + usable();

    if (bottom <= limit + 0.5) continue;

    let breakAt = top;
    for (let j = i - 1; j >= 0; j--) {
      const prev = blocks[j]!;
      if (!prev.hasAttribute("data-resume-keep-with-next")) break;
      breakAt = prev.offsetTop;
    }

    // Move the block (and kept-with header) to the next page instead of
    // clipping through it when it starts on this page.
    if (breakAt > pageStart + 1 && breakAt <= limit + 0.5) {
      pushStart(breakAt);
    }

    while (bottom > pageStart + usable() + 0.5) {
      pushStart(pageStart + usable());
    }
  }

  while (pageStart + usable() < total - 1) {
    pushStart(pageStart + usable());
  }

  return starts;
}

/**
 * Always lays out at real A4 (210×297mm) so page breaks match print / fullscreen.
 * If the parent is narrower, scales visually without reflowing text.
 */
export function A4PreviewShell({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Deterministic estimates only — real mm→px happens in useEffect after mount
  // so SSR HTML matches the first client render (avoids hydration mismatches).
  const [pageWidthPx, setPageWidthPx] = useState(() => estimateMm(A4_WIDTH_MM));
  const [pageHeightPx, setPageHeightPx] = useState(() =>
    estimateMm(A4_HEIGHT_MM),
  );
  const [padPx, setPadPx] = useState(() => estimateMm(PAGE_PAD_MM));
  const [pageStarts, setPageStarts] = useState<number[]>([0]);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setPageWidthPx(measureMm(A4_WIDTH_MM));
    setPageHeightPx(measureMm(A4_HEIGHT_MM));
    setPadPx(measureMm(PAGE_PAD_MM));
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      setPageStarts(computePageStarts(el, pageHeightPx, padPx, padPx));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    const t = window.setTimeout(measure, 100);
    return () => {
      observer.disconnect();
      window.clearTimeout(t);
    };
  }, [children, pageHeightPx, padPx]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateScale = () => {
      const available = viewport.clientWidth;
      if (available <= 0 || pageWidthPx <= 0) {
        setScale(1);
        return;
      }
      // Never upscale past 100% — only shrink to fit the panel.
      setScale(Math.min(1, available / pageWidthPx));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [pageWidthPx, pageStarts.length]);

  const pageCount = pageStarts.length;
  const unscaledStackHeight =
    pageCount * pageHeightPx + Math.max(0, pageCount - 1) * PAGE_GAP_PX;

  return (
    <div ref={viewportRef} className="a4-preview-viewport w-full">
      <div
        className="a4-preview-fit mx-auto"
        style={{
          height: `${Math.round(unscaledStackHeight * scale)}px`,
          width: `${Math.round(pageWidthPx * scale)}px`,
        }}
      >
        <div
          className="a4-preview-stack flex flex-col gap-3"
          style={{
            width: `${A4_WIDTH_MM}mm`,
            transform: scale === 1 ? undefined : `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {pageStarts.map((startPx, index) => {
            const nextStart = pageStarts[index + 1];
            const padTopPx = index === 0 ? 0 : padPx;
            const maxSlice = pageHeightPx - padTopPx - padPx;
            const rawSlice =
              nextStart != null ? nextStart - startPx : maxSlice;
            const slicePx = Math.max(0, Math.min(maxSlice, rawSlice));

            return (
              <div
                key={`${startPx}-${index}`}
                className="a4-preview-page relative overflow-hidden bg-white shadow-md ring-1 ring-border/40"
                style={{
                  width: `${A4_WIDTH_MM}mm`,
                  height: `${A4_HEIGHT_MM}mm`,
                  boxSizing: "border-box",
                }}
              >
                <div
                  className="a4-preview-page-clip absolute inset-x-0 overflow-hidden"
                  style={{
                    top: `${Math.round(padTopPx)}px`,
                    height: `${Math.round(slicePx)}px`,
                  }}
                >
                  <div
                    ref={index === 0 ? contentRef : undefined}
                    className="a4-preview-content"
                    style={{
                      width: `${A4_WIDTH_MM}mm`,
                      marginTop: startPx === 0 ? 0 : `-${startPx}px`,
                    }}
                  >
                    {children}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
