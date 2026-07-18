import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { imageFallbacks } from "@/lib/media";

export function CoinFrameImage({
  src,
  alt,
  fallbackIcon: FallbackIcon,
  shape = "square",   // "square" para NFTs, "circle" para tokens
  held = true,        // false => anillo "deslustrado"
  className = "",
}: {
  src?: string;
  alt: string;
  fallbackIcon: LucideIcon;
  shape?: "square" | "circle";
  held?: boolean;
  className?: string;
}) {
  // Some IPFS gateways are individually flaky (rate-limited or briefly
  // down), which used to make a perfectly valid NFT/token image show as
  // "broken" forever. Build the full list of candidates up front — the
  // given src first, then known alternate gateways for the same CID —
  // and step through them on error before falling back to the icon.
  const candidates = useMemo(() => {
    if (!src) return [] as string[];
    return [src, ...imageFallbacks(src)];
  }, [src]);

  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    candidates.length > 0 ? "loading" : "error"
  );

  useEffect(() => {
    setAttempt(0);
    setStatus(candidates.length > 0 ? "loading" : "error");
  }, [candidates]);

  const radius = shape === "circle" ? "rounded-full" : "rounded-xl";
  const currentSrc = candidates[attempt];

  return (
    <div
      className={`coin-frame ${radius} ${held ? "" : "tarnished"} ${className}`}
    >
      <div className={`coin-frame-inner ${radius}`}>
        {status !== "error" && currentSrc && (
          <img
            src={currentSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover ${radius} transition-opacity duration-300 ${
              status === "loaded" ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setStatus("loaded")}
            onError={() => {
              if (attempt + 1 < candidates.length) {
                setAttempt((a) => a + 1);
              } else {
                setStatus("error");
              }
            }}
          />
        )}
        {status === "loading" && (
          <div className={`sk absolute inset-0 ${radius}`} aria-hidden="true" />
        )}
        {status === "error" && (
          <div
            className={`absolute inset-0 flex items-center justify-center ${radius}`}
            aria-hidden="true"
          >
            <FallbackIcon className="h-1/2 w-1/2 opacity-70" />
          </div>
        )}
      </div>
    </div>
  );
}
