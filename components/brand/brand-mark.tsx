import Image from "next/image";
import { APP_LOGO_SRC, APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandMark({
  size = 40,
  className,
  priority = false,
  decorative = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  /** When true, hide from assistive tech (name is shown nearby). */
  decorative?: boolean;
}) {
  return (
    <Image
      src={APP_LOGO_SRC}
      alt={decorative ? "" : APP_NAME}
      width={size}
      height={size}
      priority={priority}
      className={cn("block rounded-md object-cover", className)}
    />
  );
}

export function BrandWordmark({
  className,
  showMark = true,
  markSize = 32,
}: {
  className?: string;
  showMark?: boolean;
  markSize?: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-sm font-semibold leading-none tracking-tight",
        className,
      )}
    >
      {showMark ? <BrandMark size={markSize} decorative /> : null}
      <span>{APP_NAME}</span>
    </span>
  );
}
