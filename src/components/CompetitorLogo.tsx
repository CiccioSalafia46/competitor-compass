import { useState, useEffect, memo } from "react";
import { cn } from "@/lib/utils";

function extractDomain(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

interface CompetitorLogoProps {
  name: string;
  website: string | null | undefined;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  xs: { container: "h-7 w-7 rounded-lg", text: "text-caption font-bold" },
  sm: { container: "h-8 w-8 rounded-lg", text: "text-xs font-semibold" },
  md: { container: "h-10 w-10 rounded-xl", text: "text-sm font-semibold" },
} as const;

const CompetitorLogo = memo(function CompetitorLogo({
  name,
  website,
  size = "md",
  className,
}: CompetitorLogoProps) {
  const domain = extractDomain(website);
  const [src, setSrc] = useState<string | null>(
    domain ? `https://logo.clearbit.com/${domain}` : null,
  );

  useEffect(() => {
    setSrc(domain ? `https://logo.clearbit.com/${domain}` : null);
  }, [domain]);

  const { container, text } = SIZE_CLASSES[size];

  if (!src) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center border bg-muted/40 text-foreground/60",
          container,
          text,
          className,
        )}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className={cn("shrink-0 overflow-hidden border bg-background shadow-sm", container, className)}>
      <img
        src={src}
        alt={`${name} logo`}
        className="h-full w-full object-contain p-[3px]"
        onError={() => setSrc(null)}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
});

export default CompetitorLogo;
