"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { SafeBg } from "./safebg";

/*
  AccessCardPage.jsx

  - Uses <img> for the decorative background (prefers a preloaded dataURL) so iOS paints it reliably.
  - Adds usePreloadedBg to convert /7-pray.png into a data URL for reliable exports and painting.
  - Keeps the "banger" card modal design, responsive fixes for mobile, and prevents clipping.
  - Export uses toPng on the cardRef as before.
*/

function safeHandle(input) {
  return (input || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/[^\w]/g, "")
    .slice(0, 15);
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

function Badge({ children, className = "" }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border border-white/15 bg-white/6 px-3 py-1 text-xs text-white/85 " +
        className
      }
    >
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
        active
          ? "border-white/25 bg-white/15 text-white"
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Avatar({ handleOrName, imageDataUrl, profileImageUrl, forceInitials = false, size = 56 }) {
  const letter = (handleOrName?.[0] || "B").toUpperCase();

  const fallbackUrl =
    !forceInitials && !imageDataUrl && handleOrName && /^[\w]{1,15}$/.test(handleOrName)
      ? `https://unavatar.io/twitter/${handleOrName}`
      : "";

  const src = imageDataUrl || (!forceInitials ? profileImageUrl || fallbackUrl : "");
  const [imgOk, setImgOk] = useState(true);
  const sizeStyle = typeof size === "number" ? { width: size, height: size } : {};

  return (
    <div
      style={sizeStyle}
      className="flex-shrink-0 overflow-hidden rounded-2xl bg-white/6 ring-1 ring-white/12"
    >
      {src && imgOk ? (
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
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-white/10 to-white/5">
          <span className="text-2xl font-semibold text-white/90">{letter}</span>
        </div>
      )}
    </div>
  );
}

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

function computeAccess(statusRoles, regionalRole) {
  if (!regionalRole) {
    return {
      level: "None",
      colorClass: "bg-red-600/20 border-red-400/10 text-red-200",
      note: "Pick a regional role to enable the access card.",
    };
  }

  const { verified, bulker, lvl2, og } = statusRoles;
  const isFull =
    verified ||
    (bulker && (lvl2 || og)) ||
    (bulker && verified) ||
    (lvl2 && og && bulker);

  if (isFull) {
    return {
      level: "Full",
      colorClass: "bg-emerald-600/20 border-emerald-400/10 text-emerald-200",
      note: "Full access granted — use responsibly.",
    };
  }

  return {
    level: "Limited",
    colorClass: "bg-amber-600/20 border-amber-400/10 text-amber-200",
    note: "Limited access — consider adding roles for greater access.",
  };
}

// Preload bg as data URL so iOS paints it reliably and html-to-image includes it
function usePreloadedBg(src) {
  const [bgDataUrl, setBgDataUrl] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (!src) return;
    (async () => {
      try {
        const res = await fetch(src, { cache: "force-cache" });
        if (!res.ok) return;
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!cancelled) setBgDataUrl(String(reader.result || ""));
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        console.warn("bg preload failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);
  return bgDataUrl;
}

export default function Page() {
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);

  const [rawHandle, setRawHandle] = useState("");
  const [handle, setHandle] = useState("");
  const [manualName, setManualName] = useState("");

  const [statusRoles, setStatusRoles] = useState({
    verified: false,
    bulker: true,
    lvl2: false,
    og: false,
    contributor: false,
  });
  const [regionalRole, setRegionalRole] = useState("");

  const [xProfile, setXProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErr, setProfileErr] = useState(null);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [profileImageDataUrl, setProfileImageDataUrl] = useState("");

  const cardId = useMemo(() => makeId(handle), [handle]);
  const issueDate = useMemo(() => formatDate(new Date()), []);

  // preload background as data URL
  const bgDataUrl = usePreloadedBg("/7-pray.png");

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

        const res = await fetch(`/api/x-profile?username=${encodeURIComponent(handle)}`, {
          cache: "no-store",
        });
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

  const isFormComplete = Boolean(handle && manualName.trim() && regionalRole);

  useEffect(() => {
    if (isFormComplete) {
      const t = setTimeout(() => setShowModal(true), 80);
      return () => clearTimeout(t);
    }
    setShowModal(false);
  }, [isFormComplete]);

  useEffect(() => {
    if (!showModal) return;
    function onKey(e) {
      if (e.key === "Escape") setShowModal(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal]);

  const xVerified = !!xProfile?.verified;

  const activeStatusLabels = STATUS_ROLES.filter((r) =>
    r.key === "verified" ? statusRoles.verified || xVerified : statusRoles[r.key]
  ).map((r) => r.label);

  const selectedRegion = REGIONAL_ROLES.find((r) => r.label === regionalRole);
  const finalName = manualName.trim() || xProfile?.name || "BULK Trader";
  const access = computeAccess(statusRoles, regionalRole);

  function handleFileUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfileImageDataUrl(String(reader.result || ""));
      showToast("Profile image added ✅");
    };
    reader.onerror = () => showToast("Failed to read file ❌");
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function embedXProfileImage() {
    if (!xProfile?.profile_image_url) {
      showToast("No profile image available on X");
      return;
    }
    showToast("Embedding profile image…");
    const dataUrl = await fetchImageToDataUrl(xProfile.profile_image_url);
    if (dataUrl) {
      setProfileImageDataUrl(dataUrl);
      showToast("Profile image added ✅");
    } else {
      showToast("Embed failed (CORS) — try upload instead");
    }
  }

  async function generatePngBlob() {
    if (!cardRef.current) throw new Error("No card to render");

    setExporting(true);
    // tiny pause to let the DOM reflow (if necessary)
    await new Promise((r) => setTimeout(r, 140));
    try {
      if (document.fonts?.ready) await document.fonts.ready;
    } catch {}
    await new Promise((r) => requestAnimationFrame(() => r()));

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "transparent",
        useCORS: true,
        skipFonts: true,
      });

      const res = await fetch(dataUrl);
      return await res.blob();
    } finally {
      setExporting(false);
    }
  }

  function triggerDownload(blobOrUrl, filename) {
    if (!blobOrUrl) return;
    if (typeof blobOrUrl === "string") {
      const a = document.createElement("a");
      a.href = blobOrUrl;
      a.download = filename;
      a.click();
      return;
    }
    const url = URL.createObjectURL(blobOrUrl);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function downloadCard() {
    if (!isFormComplete) {
      showToast("Please enter username, name and select a region first");
      return;
    }

    setLoading(true);
    try {
      const blob = await generatePngBlob();
      triggerDownload(blob, `bulk-access-card-${handle || "guest"}.png`);
      showToast("Downloaded ✅");
    } catch (e) {
      console.error(e);
      showToast("Download failed ❌");
    } finally {
      setLoading(false);
    }
  }

  async function copyShareLink() {
    const base = window?.location?.origin || "https://bulk-six.vercel.app";
    const params = new URLSearchParams();
    if (handle) params.set("u", handle);
    if (manualName.trim()) params.set("name", manualName.trim());
    if (regionalRole) params.set("region", regionalRole);
    const url = `${base}${params.toString() ? `/?${params.toString()}` : "/"}`;

    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied ✅");
    } catch (e) {
      showToast("Copy failed ❌");
    }
  }

  async function shareCard() {
    if (!isFormComplete) {
      showToast("Please enter username, name and select a region first");
      return;
    }
    const intentUrl =
      "https://twitter.com/intent/tweet?text=" +
      encodeURIComponent(
        `Just minted my BULK Access Card 🪪\n\nBULK - One Exchange\nInfinite Markets\n\nGet yours: ${
          window?.location?.origin || "https://bulk-six.vercel.app"
        }\n#BULK`
      );
    window.open(intentUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-5 text-center">
          <div className="mx-auto inline-flex items-center justify-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="BULK" className="h-10 w-auto rounded-xl" />
            <span className="text-sm text-white/60">Access Card Generator</span>
          </div>

          <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
            Enter username, pick roles, generate your card
          </h1>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur">
          <div className="space-y-5">
            {/* Form (same as before) */}
            <div>
              <label className="mb-2 block text-sm text-white/70">Twitter/X Username</label>
              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/70">@</span>
                <input
                  value={rawHandle}
                  onChange={(e) => setRawHandle(e.target.value)}
                  onBlur={() => {
                    const sanitized = safeHandle(rawHandle);
                    setRawHandle(sanitized);
                    setHandle(sanitized);
                  }}
                  placeholder="e.g. maharshi_2207"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:border-white/20"
                />
              </div>

              <div className="mt-2 text-xs">
                {profileLoading ? (
                  <span className="text-white/60">Fetching profile…</span>
                ) : profileErr ? (
                  <span className="text-red-300/80">{profileErr}</span>
                ) : xProfile ? (
                  <span className="text-emerald-300/80">
                    Loaded: {xProfile.name} (@{xProfile.username})
                  </span>
                ) : (
                  <span className="text-white/45">Fill all fields to open card popup</span>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">Display Name (manual)</label>
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value.slice(0, 26))}
                placeholder="e.g. Maharshi"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:border-white/20"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm text-white/70">Profile image (optional)</label>
              </div>

              <div className="flex items-center gap-3">
                <Avatar
                  handleOrName={handle || manualName || "B"}
                  imageDataUrl={profileImageDataUrl || undefined}
                  profileImageUrl={xProfile?.profile_image_url || undefined}
                  forceInitials={false}
                  size={56}
                />

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFileUploadClick}
                      className="rounded-full bg-white/6 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                    >
                      Upload image
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {!profileImageDataUrl && xProfile?.profile_image_url ? (
                      <button
                        type="button"
                        onClick={embedXProfileImage}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
                      >
                        Embed from X
                      </button>
                    ) : null}

                    {profileImageDataUrl ? (
                      <button
                        type="button"
                        onClick={() => setProfileImageDataUrl("")}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <p className="mt-2 text-xs text-white/45">After upload, it will show on your card too.</p>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm text-white/70">Step 1 — Select status roles</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setStatusRoles({
                        verified: false,
                        bulker: true,
                        lvl2: false,
                        og: false,
                        contributor: false,
                      })
                    }
                    className="text-xs text-white/50 hover:text-white/80"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusRoles((s) => ({ ...s, verified: true }))}
                    className="text-xs text-white/50 hover:text-white/80"
                  >
                    Quick verified
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUS_ROLES.map((r) => {
                  const active =
                    r.key === "verified" ? statusRoles.verified || xVerified : !!statusRoles[r.key];

                  return (
                    <TogglePill
                      key={r.key}
                      active={active}
                      onClick={() => {
                        if (r.key === "verified") {
                          setStatusRoles((s) => ({ ...s, verified: !s.verified }));
                        } else {
                          setStatusRoles((s) => ({ ...s, [r.key]: !s[r.key] }));
                        }
                      }}
                    >
                      {r.label}
                      {r.key === "verified" && xVerified ? " (X)" : ""}
                    </TogglePill>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">Step 2 — Select regional role</label>

              <div className="region-scroll max-h-56 overflow-auto rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="grid gap-2">
                  {REGIONAL_ROLES.map((r) => {
                    const active = regionalRole === r.label;
                    return (
                      <button
                        key={r.label}
                        type="button"
                        onClick={() => setRegionalRole(r.label)}
                        className={[
                          "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition",
                          active
                            ? "border-white/25 bg-white/15"
                            : "border-white/10 bg-white/5 hover:bg-white/10",
                        ].join(" ")}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-lg">{r.emoji}</span>
                          <span className="text-white/85">{r.label}</span>
                        </span>
                        {active ? <span className="text-xs text-white/70">Selected</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {access.level !== "None" ? (
                <div className={"rounded-2xl border px-3 py-2 text-sm " + access.colorClass}>
                  <div className="text-xs">ACCESS</div>
                  <div className="font-medium">{access.level}</div>
                  <div className="mt-1 text-xs text-white/60">{access.note}</div>
                </div>
              ) : (
                <div className="text-xs text-white/45">Complete the form to open the popup with the card.</div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                onClick={() => setShowModal(true)}
                disabled={!isFormComplete}
                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60 sm:w-auto"
              >
                Open Card Popup
              </button>

              <button
                onClick={copyShareLink}
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 hover:bg-white/10 sm:w-auto"
              >
                Copy Share Link
              </button>

              <button
                onClick={shareCard}
                disabled={loading || !isFormComplete}
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 hover:bg-white/10 disabled:opacity-60 sm:w-auto"
              >
                Share on X (text + link)
              </button>
            </div>
          </div>
        </section>

        {/* MODAL */}
        {showModal ? (
          <div
            className="fixed inset-0 z-50 grid place-items-center px-3 sm:px-4"
            aria-modal="true"
            role="dialog"
            onClick={() => setShowModal(false)}
          >
            {/* overlay with iOS-friendly blur */}
            <div
              className="absolute inset-0"
              style={{
                background: "rgba(0,0,0,0.60)",
                WebkitBackdropFilter: "blur(8px)",
                backdropFilter: "blur(8px)",
              }}
            />

            <div
              className="relative z-50 w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
              aria-label="Access card popup"
            >
              {/* close */}
              <div className="mb-3 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  aria-label="Close"
                  className="rounded-full bg-white/6 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              {/* responsive card wrapper */}
              <div className="mx-auto w-[min(620px,96vw)] card-outer">
                <div
                  ref={cardRef}
                  className="card relative overflow-hidden rounded-[26px] border p-6 sm:p-7 shadow-2xl"
                  style={{
                    background:
                      "radial-gradient(1200px 420px at 10% 10%, rgba(255,255,255,0.06), transparent 55%), linear-gradient(180deg, rgba(8,10,14,0.94), rgba(4,6,10,0.98))",
                    borderColor: "rgba(255,255,255,0.10)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Background image as <img> (preferred for iOS) */}
                  {/* use preloaded data URL if available, fallback to path */}
                  {bgDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={bgDataUrl}
                      alt=""
                      className="card-img pointer-events-none absolute inset-0 w-full h-full"
                      style={{ objectFit: "contain", objectPosition: "center", opacity: 0.42 }}
                    />
                  ) : (
               
<SafeBg
  src="/7-pray.png"
  className="card-img pointer-events-none absolute inset-0 w-full h-full"
  objectFit={typeof window !== "undefined" && window.innerWidth < 640 ? "cover" : "contain"}
  opacity={0.42}
/>

                  )}

                  {/* soft vignette + overlay for readability */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-black/65" />
                  <div className="pointer-events-none absolute inset-0 bg-black/18" />

                  {/* scrollable inner - prevents content from being clipped on short screens */}
                  <div className="card-inner relative z-10 flex flex-col gap-4">
                    {/* top row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="rounded-[18px] bg-white/6 p-1 ring-1 ring-white/12">
                          <Avatar
                            handleOrName={handle || finalName}
                            imageDataUrl={profileImageDataUrl || undefined}
                            profileImageUrl={xProfile?.profile_image_url || undefined}
                            forceInitials={exporting && !profileImageDataUrl}
                            size={78}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="text-[11px] tracking-[0.12em] text-white/70">BULK ACCESS CARD</div>
                          <div className="truncate text-xl sm:text-2xl font-semibold leading-tight">{finalName}</div>
                          <div className="truncate text-sm text-white/80">@{handle || "guest"}</div>
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <div className="text-[11px] tracking-[0.12em] text-white/60">CARD ID</div>
                        <div className="font-mono text-sm text-white/90">{cardId}</div>
                      </div>
                    </div>

                    {/* badges */}
                    <div className="flex flex-wrap gap-2">
                      {activeStatusLabels.map((label) => (
                        <Badge key={label}>{label}</Badge>
                      ))}
                      {regionalRole ? (
                        <Badge>{selectedRegion ? `${selectedRegion.emoji} ${selectedRegion.label}` : regionalRole}</Badge>
                      ) : null}
                      {access.level !== "None" ? (
                        <Badge className="ml-1">
                          Access: <span className="ml-2 font-medium">{access.level}</span>
                        </Badge>
                      ) : null}
                    </div>

                    {/* mid panel */}
                    <div className="rounded-2xl border border-white/12 bg-black/35 p-3 sm:p-4">
                      <div className="text-[11px] tracking-[0.12em] text-white/65">ACCESS NOTE</div>
                      <div className="mt-2 text-sm text-white/95 leading-relaxed">
                        <span className="font-semibold">BULK</span> - One Exchange
                        <br />
                        Infinite Markets
                      </div>
                    </div>

                    {/* optional small bio */}
                    {xProfile?.description ? (
                      <div className="text-xs text-white/60 line-clamp-2">{xProfile.description}</div>
                    ) : null}

                    {/* footer */}
                    <div className="mt-auto flex items-center justify-between border-t border-white/12 pt-3 text-xs text-white/70">
                      <div>bulktrade</div>
                      <div>Shareable Access Card</div>
                    </div>
                  </div>
                </div>

                {/* actions */}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    onClick={downloadCard}
                    disabled={loading || exporting}
                    className="w-full sm:w-auto rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
                  >
                    {loading || exporting ? "Exporting..." : "Download PNG"}
                  </button>

                  <button
                    onClick={shareCard}
                    disabled={loading}
                    className="w-full sm:w-auto rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 hover:bg-white/10 disabled:opacity-60"
                  >
                    Share (text + link)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {toast ? (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-sm text-white/85 backdrop-blur">
            {toast}
          </div>
        ) : null}
      </div>

      <style jsx>{`
        /* ensure inner area scrolls instead of being cut */
        .card-outer { display: block; }
        .card { box-sizing: border-box; max-height: 92vh; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); }
        .card-inner { max-height: calc(92vh - 160px); overflow-y: auto; padding-right: 6px; display:flex; flex-direction:column; }
        .card-img { display: block; width: 100%; height: 100%; }

        /* On small screens prefer cover so the bg looks good */
        @media (max-width: 640px) {
          .card { padding: 12px; border-radius: 14px; }
          .card-inner { max-height: calc(92vh - 140px); }
          .card-img { object-fit: cover; opacity: 0.36 !important; }
        }
        @media (min-width: 641px) {
          .card-img { object-fit: contain; opacity: 0.42 !important; }
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .region-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.25) rgba(255, 255, 255, 0.06);
        }
        .region-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .region-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
        }
        .region-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.22);
          border-radius: 999px;
          border: 2px solid rgba(0, 0, 0, 0);
          background-clip: padding-box;
        }
        .region-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.32);
        }
      `}</style>
    </main>
  );
}