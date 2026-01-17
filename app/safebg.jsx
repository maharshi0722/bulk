// SafeBg.jsx (paste into same file above or below Page component)
import React, { useEffect, useState } from "react";

/**
 * SafeBg
 * Props:
 * - src: string (path to image)
 * - className, style: passed to <img>
 * - objectFit: "cover" | "contain"
 * - opacity: number (0..1)
 *
 * Behavior:
 * - Attempts to fetch the image, convert to dataURL and render <img src={dataUrl}>
 * - If fetch/convert fails, falls back to rendering <img src={src}> (still better than CSS bg)
 * - If that fails, falls back to rendering a subtle gradient DIV (no image)
 * - Adds translateZ(0) to force compositing on WebKit (iOS)
 */
export function SafeBg({ src, className = "", style = {}, objectFit = "contain", opacity = 0.42, alt = "" }) {
  const [dataUrl, setDataUrl] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!src) return;
    (async () => {
      try {
        // Try to fetch + convert to dataURL so the image is same-origin (best for html-to-image)
        const res = await fetch(src, { cache: "force-cache" });
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!cancelled) setDataUrl(String(reader.result || ""));
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        // swallow - we'll fallback to direct src
        console.warn("SafeBg preload failed:", e);
        setDataUrl(""); // ensure empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  // If image was preloaded as dataUrl, render it. Otherwise render the original src in <img>.
  // If both fail to load (onError), we fallback to a subtle gradient div.
  if (dataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={dataUrl}
        alt={alt}
        className={className}
        style={{
          objectFit,
          objectPosition: "center",
          opacity,
          transform: "translateZ(0)",
          ...style,
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
        decoding="async"
      />
    );
  }

  // No dataUrl yet - render direct src <img> (still better than CSS background for iOS)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={{
        objectFit,
        objectPosition: "center",
        opacity,
        transform: "translateZ(0)",
        ...style,
      }}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(false)}
      crossOrigin="anonymous"
      decoding="async"
    />
  );
}