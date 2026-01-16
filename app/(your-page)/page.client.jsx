"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

/* --- helper functions (same as before) --- */
function safeHandle(input) {
  return (input || "").trim().replace(/^@+/, "").replace(/[^\w]/g, "").slice(0, 15);
}
function makeId(handle) {
  const base = `${(handle || "guest").toLowerCase()}-bulk`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  return String(hash).padStart(10, "0").slice(0, 10);
}
function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* --- small UI components --- */
function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/85">
      {children}
    </span>
  );
}
function TogglePill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-xs transition",
        active ? "border-white/25 bg-white/15 text-white" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
function Avatar({ handleOrName, profileImageUrl }) {
  const letter = (handleOrName?.[0] || "B").toUpperCase();
  const fallbackUrl = handleOrName && /^[\w]{1,15}$/.test(handleOrName) ? `https://unavatar.io/twitter/${handleOrName}` : "";
  const src = profileImageUrl || fallbackUrl;
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/10 ring-2 ring-white/10">
      {src && imgOk ? (
        // IMPORTANT: crossOrigin attribute to reduce chance of canvas tainting. Ensure remote host enables CORS.
        // If your avatar is external and not CORS-enabled, rehost via Cloudinary fetch or your server.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="avatar"
          className="h-full w-full object-cover"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onLoad={() => setImgOk(true)}
          onError={() => setImgOk(false)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <span className="text-2xl font-semibold text-white/90">{letter}</span>
        </div>
      )}
    </div>
  );
}

/* --- roles arrays same as before (omit to shorten here) --- */
const REGIONAL_ROLES = [
  { emoji: "🇨🇳", label: "Chinese" },
  { emoji: "🇯🇵", label: "Japanese" },
  { emoji: "🇰🇷", label: "Korean" },
  { emoji: "🇷🇺", label: "Russian" },
  { emoji: "🇺🇦", label: "Ukrainian" },
  { emoji: "🇹🇷", label: "Turkish" },
  { emoji: "🇮🇳", label: "Indian" },
  { emoji: "🇻🇳", label: "Vietnamese" },
  { emoji: "🇩🇪", label: "German" },
  { emoji: "🇧🇷", label: "Brazil" },
  { emoji: "🇮🇩", label: "Indonesian" },
  { emoji: "🇫🇷", label: "French" },
  { emoji: "🇵🇹", label: "Portuguese" },
  { emoji: "🇵🇭", label: "Philippines" },
  { emoji: "🇪🇸", label: "Spanish" },
  { emoji: "🇳🇬", label: "Nigerian" },
  { emoji: "🇧🇩", label: "Bengali" },
  { emoji: "🇵🇰", label: "Pakistani" },
];
const STATUS_ROLES = [
  { key: "verified", label: "Verified" },
  { key: "bulker", label: "Bulker" },
  { key: "lvl2", label: "Lvl 2" },
  { key: "og", label: "OG" },
  { key: "contributor", label: "Contributor" },
];

/* --- Page component (only relevant bits shown; reuse the rest of your UI) --- */
export default function Page() {
  const cardRef = useRef(null);
  const [rawHandle, setRawHandle] = useState("");
  const [handle, setHandle] = useState("");
  const [manualName, setManualName] = useState("");
  const [statusRoles, setStatusRoles] = useState({ verified: false, bulker: true, lvl2: false, og: false, contributor: false });
  const [regionalRole, setRegionalRole] = useState("");
  const [xProfile, setXProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErr, setProfileErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const cardId = useMemo(() => makeId(handle), [handle]);
  const issueDate = useMemo(() => formatDate(new Date()), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get("u");
    const name = params.get("name");
    const region = params.get("region");
    if (u) {
      setRawHandle(u);
      setHandle(safeHandle(u));
    }
    if (name) setManualName(name.slice(0, 26));
    if (region) setRegionalRole(region);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (handle) params.set("u", handle);
    else params.delete("u");
    if (manualName.trim()) params.set("name", manualName.trim());
    else params.delete("name");
    if (regionalRole) params.set("region", regionalRole);
    else params.delete("region");
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [handle, manualName, regionalRole]);

  function showToast(msg, duration = 2200) {
    setToast(msg);
    window.setTimeout(() => setToast(null), duration);
  }

  useEffect(() => {
    if (!handle) {
      setXProfile(null);
      setProfileErr(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setProfileLoading(true);
        setProfileErr(null);
        const res = await fetch(`/api/x-profile?username=${encodeURIComponent(handle)}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) {
            setXProfile(null);
            setProfileErr(data?.error || "Could not fetch profile");
          }
          return;
        }
        if (!cancelled) setXProfile(data);
      } catch (e) {
        if (!cancelled) {
          setXProfile(null);
          setProfileErr("Network error fetching profile");
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [handle]);

  // Generate PNG data URL (tries Safari-friendly options first)
  async function generatePngDataUrl() {
    if (!cardRef.current) throw new Error("No card to render");
    try {
      return await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#070A12", skipFonts: true });
    } catch (err) {
      // try again without skipFonts
      return await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#070A12", skipFonts: false });
    }
  }

  async function downloadPNG() {
    setLoading(true);
    try {
      const dataUrl = await generatePngDataUrl();
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `bulk-access-card-${handle || "guest"}.png`;
      a.click();
      showToast("Downloaded PNG ✅");
    } catch (e) {
      console.error(e);
      showToast("Download failed. If you see a CORS error, rehost external avatars via Cloudinary.");
    } finally {
      setLoading(false);
    }
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Share link copied ✅");
    } catch {
      showToast("Copy failed ❌");
    }
  }

  // Upload PNG to Cloudinary and return URL
  async function uploadPngDataUrl(dataUrl) {
    const res = await fetch("/api/upload-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
    const out = await res.json();
    if (!res.ok) throw new Error(out?.error || "Upload failed");
    return out.url;
  }

  // Main share flow: upload → create /share OG URL → attempt native share → fallback to tweet intent
// Replace your existing shareWithOGImage() with this
// Replace your existing shareWithOGImage with this version
async function shareWithOGImage() {
  if (!cardRef.current) return;
  setLoading(true);

  const badges = [
    statusRoles.verified ? "Verified" : null,
    statusRoles.bulker ? "Bulker" : null,
    statusRoles.lvl2 ? "Lvl 2" : null,
    statusRoles.og ? "OG" : null,
    statusRoles.contributor ? "Contributor" : null,
    regionalRole ? `Region: ${regionalRole}` : null,
  ].filter(Boolean);

  try {
    // 1) Render card -> dataUrl
    const dataUrl = await generatePngDataUrl();

    // 2) Upload to Cloudinary (via your /api/upload-card)
    const res = await fetch("/api/upload-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
    const out = await res.json();
    if (!res.ok || !out?.url) throw new Error(out?.error || "Upload failed or no url returned");

    const cloudUrl = out.url; // PUBLIC cloudinary URL (https)

    // Debug log so you can confirm the URL
    console.log("Uploaded image URL:", cloudUrl);
    // Also optionally open it for quick check (uncomment while debugging)
    // window.open(cloudUrl, "_blank");

    // 3) Build the share text
    const shareUrl = cloudUrl; // prefer direct public URL for tweet
    const text = `Just minted my BULK Access Card 🪪

${badges.length ? badges.join(" • ") + "\n\n" : ""}
BULK - One Exchange
Infinite Markets

Get yours: ${shareUrl}
#BULK`;

    // 4) Try best native share (files) — Android + modern browsers
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `bulk-access-card-${handle || "guest"}.png`, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text, title: "BULK Access Card", url: shareUrl });
        showToast("Shared with native share ✅");
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Native file share failed:", err);
    }

    // 5) Prefer navigator.share(text + url) on mobile Safari (iOS)
    if (navigator.share) {
      try {
        // include cloudUrl in both text and url param
        await navigator.share({ title: "BULK Access Card", text, url: shareUrl });
        showToast("Shared ✅");
        setLoading(false);
        return;
      } catch (err) {
        console.warn("navigator.share text+url failed:", err);
      }
    }

    // 6) Desktop fallback: open twitter intent with url param + text
    // Use both text and url parameters so Twitter recognizes the link.
    const intentUrl =
      "https://twitter.com/intent/tweet?text=" +
      encodeURIComponent(text) +
      "&url=" +
      encodeURIComponent(shareUrl);

    // Open the composer
    window.open(intentUrl, "_blank", "noopener,noreferrer");

    // Copy cloud url to clipboard as a helpful fallback
    try {
      await navigator.clipboard.writeText(cloudUrl);
      showToast("Cloud image URL copied — opened tweet composer");
    } catch {
      showToast("Opened tweet composer");
    }
  } catch (err) {
    console.error("shareWithOGImage error:", err);
    showToast("Share failed — check console for details");
  } finally {
    setLoading(false);
  }
}

  const xVerified = !!xProfile?.verified;
  const activeStatusLabels = STATUS_ROLES.filter((r) => (r.key === "verified" ? statusRoles.verified || xVerified : statusRoles[r.key])).map((r) => r.label);
  const selectedRegion = REGIONAL_ROLES.find((r) => r.label === regionalRole);
  const finalName = manualName.trim() || xProfile?.name || "BULK Trader";

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      {/* ... your UI unchanged ... */}
      {/* keep your cardRef assigned to the preview card element */}
      {/* buttons should call downloadPNG(), copyShareLink(), shareWithOGImage() */}
      {toast ? <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-sm text-white/85 backdrop-blur">{toast}</div> : null}

      {/* Helpful inline troubleshooting note */}
      <div style={{ position: "fixed", right: 12, bottom: 18, fontSize: 12, color: "#cbd5e1", opacity: 0.9 }}>
        Tip: If sharing fails on iPhone, ensure any avatar image shown on the card is CORS-enabled (served with Access-Control-Allow-Origin: *).
        Rehosting remote avatars through Cloudinary fetch (or uploading them to your server) fixes canvas tainting.
      </div>
    </main>
  );
}