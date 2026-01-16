"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

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
        active
          ? "border-white/25 bg-white/15 text-white"
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Avatar({ handleOrName, profileImageUrl }) {
  const letter = (handleOrName?.[0] || "B").toUpperCase();
  const fallbackUrl =
    handleOrName && /^[\w]{1,15}$/.test(handleOrName)
      ? `https://unavatar.io/twitter/${handleOrName}`
      : "";
  const src = profileImageUrl || fallbackUrl;

  const [imgOk, setImgOk] = useState(true);

  return (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white/10 ring-2 ring-white/10">
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
        <div className="grid h-full w-full place-items-center">
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

export default function Page() {
  const cardRef = useRef(null);

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
  const [toast, setToast] = useState(null);

  const cardId = useMemo(() => makeId(handle), [handle]);
  const issueDate = useMemo(() => formatDate(new Date()), []);

  // read params
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

  // update params
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

  function showToast(msg, duration = 2000) {
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

  async function generatePngBlob() {
    if (!cardRef.current) throw new Error("No card to render");

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#070A12",
        skipFonts: true,
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (err) {
      try {
        const dataUrl = await toPng(cardRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#070A12",
          skipFonts: false,
        });
        const res = await fetch(dataUrl);
        return await res.blob();
      } catch (err2) {
        throw err2;
      }
    }
  }

  async function downloadPNG() {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      const blob = await generatePngBlob();
      const dataUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `bulk-access-card-${handle || "guest"}.png`;
      link.href = dataUrl;
      link.click();
      setTimeout(() => URL.revokeObjectURL(dataUrl), 5000);
      showToast("Downloaded PNG ✅");
    } catch (e) {
      console.error(e);
      showToast("Download failed ❌");
    } finally {
      setLoading(false);
    }
  }

  async function copyShareLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Share link copied ✅");
    } catch (e) {
      console.warn("Clipboard write failed", e);
      showToast("Copy failed ❌");
    }
  }

  // New: simplified cross-platform share to X (no image attachment)
  async function shareToXWithoutImage() {
    // builds a tweet text and opens X/Twitter composer; uses navigator.share where supported
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const cardLink = window.location.href || (origin ? `${origin}/?u=${encodeURIComponent(handle || "")}` : "");

    const badges = [
      statusRoles.verified ? "Verified" : null,
      statusRoles.bulker ? "Bulker" : null,
      statusRoles.lvl2 ? "Lvl 2" : null,
      statusRoles.og ? "OG" : null,
      statusRoles.contributor ? "Contributor" : null,
      regionalRole ? `Region: ${regionalRole}` : null,
    ].filter(Boolean);

    const tweetText = `Just minted my BULK Access Card 🪪

${badges.length ? badges.join(" • ") + "\n\n" : ""}BULK - One Exchange
Infinite Markets

Get yours: bulk-six.vercel.app
#BULK`;

    setLoading(true);
    try {
      // Prefer navigator.share (mobile native share) if available
      if (navigator.share) {
        try {
          await navigator.share({
            title: "BULK Access Card",
            text: tweetText,
            url: cardLink,
          });
          showToast("Shared via native share ✅");
          setLoading(false);
          return;
        } catch (err) {
          // If user cancels or share fails, fall back to tweet intent
          console.warn("navigator.share failed or cancelled:", err);
        }
      }

      // Build Twitter/X intent URL with both text and url parameters (improves parsing)
      const intentUrl =
        "https://twitter.com/intent/tweet?text=" +
        encodeURIComponent(tweetText) +
        "&url=" +
        encodeURIComponent(cardLink);

      // On mobile open in same tab where possible (safer for some in-app browsers), else new tab
      window.open(intentUrl, "_blank", "noopener,noreferrer");
      showToast("Opened X composer");
    } catch (err) {
      console.error("shareToXWithoutImage error:", err);
      showToast("Share failed ❌");
    } finally {
      setLoading(false);
    }
  }

  // Legacy shareCard kept but simplified: attempts native share then opens tweet intent (no image)
  async function shareCard() {
    return shareToXWithoutImage();
  }

  const xVerified = !!xProfile?.verified;

  const activeStatusLabels = STATUS_ROLES.filter((r) =>
    r.key === "verified" ? statusRoles.verified || xVerified : statusRoles[r.key]
  ).map((r) => r.label);

  const selectedRegion = REGIONAL_ROLES.find((r) => r.label === regionalRole);

  const finalName = manualName.trim() || xProfile?.name || "BULK Trader";

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-90">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-fuchsia-500/20 via-cyan-400/10 to-emerald-400/15 blur-3xl" />
        <div className="absolute bottom-[-200px] right-[-120px] h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-cyan-500/15 via-indigo-500/10 to-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-10">
        <header className="mb-6 flex flex-col gap-2">
          <div className="inline-flex items-center gap-3">
            <img src="/logo.png" alt="BULK" className="h-10 w-auto rounded-xl" />
            <span className="text-sm text-white/60">Access Card Generator</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Enter username, pick roles, generate your card
          </h1>

        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur">
            <div className="space-y-5">
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
                    placeholder="e.g. maharshi_2207 (no @ required)"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:border-white/20"
                  />
                </div>

                <div className="mt-2 flex items-center gap-3 text-xs">
                  {profileLoading ? (
                    <span className="text-white/60">Fetching profile…</span>
                  ) : profileErr ? (
                    <span className="text-red-300/80">{profileErr}</span>
                  ) : xProfile ? (
                    <span className="text-emerald-300/80">Loaded: {xProfile.name} (@{xProfile.username})</span>
                  ) : (
                    <span className="text-white/45"></span>
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
                <p className="mt-2 text-xs text-white/45">If filled, this name shows on the card (overrides X name).</p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm text-white/70">Step 1 — Select status roles</label>
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

                <div className="max-h-56 overflow-auto rounded-2xl border border-white/10 bg-white/5 p-3">
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
                            active ? "border-white/25 bg-white/15" : "border-white/10 bg-white/5 hover:bg-white/10",
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

                <p className="mt-2 text-xs text-white/45">One regional role at a time (like Discord reaction roles).</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 pt-1">
                <button
                  onClick={downloadPNG}
                  disabled={loading}
                  className="block w-full sm:w-auto rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
                >
                  {loading ? "Exporting..." : "Download PNG"}
                </button>

     

                <button
                  onClick={shareCard}
                  disabled={loading}
                  className="block w-full sm:w-auto rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 hover:bg-white/10 disabled:opacity-60"
                >
                  Share on X (text + link)
                </button>
              </div>
            </div>
          </section>

          <section className="flex flex-col items-center justify-start">
            <div
              ref={cardRef}
              className="relative w-full max-w-sm sm:max-w-md overflow-hidden rounded-[22px] border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-white/10 p-4 sm:p-6 shadow-2xl"
            >
              <div className="pointer-events-none absolute inset-0">
                  <img
    src="/7-pray.png"
    alt=""
    className="h-full w-full object-cover opacity-25"
    crossOrigin="anonymous"
    referrerPolicy="no-referrer"
  />
                <div className="absolute -top-20 -left-12 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" />
                <div className="absolute -bottom-20 -right-12 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.10),transparent_45%)]" />
              </div>

              <div className="relative">
                <div className="flex items-start justify-between gap-3 pr-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar handleOrName={handle || finalName} profileImageUrl={xProfile?.profile_image_url || null} />
                    <div className="min-w-0">
                      <div className="text-xs text-white/60">BULK TRADE</div>
                      <div className="truncate text-base sm:text-lg font-semibold leading-tight">{finalName}</div>
                      <div className="truncate text-sm text-white/70">@{handle || "guest"}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-white/50">CARD ID</div>
                    <div className="font-mono text-sm text-white/80">{cardId}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {activeStatusLabels.map((label) => (
                    <Badge key={label}>{label}</Badge>
                  ))}
                  {regionalRole ? <Badge>{selectedRegion ? `${selectedRegion.emoji} ${selectedRegion.label}` : regionalRole}</Badge> : null}
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs text-white/50">ACCESS NOTE</div>
                  <div className="mt-2 text-sm text-white/80">
                    <span className="font-semibold">BULK</span> - One Exchange
                    <br />
                    Infinite Markets
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-xs text-white/50">ISSUED</div>
                    <div className="text-sm text-white/80">{issueDate}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/50">STATUS</div>
                    <div className="text-sm font-medium text-white/85">ACTIVE</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                  <div className="text-xs text-white/50">bulktrade</div>
                  <div className="text-xs text-white/60">Shareable Access Card</div>
                </div>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-white/45">Tip: choose roles on the left like Discord, then download/share.</p>
          </section>
        </div>

        {toast ? (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-sm text-white/85 backdrop-blur">
            {toast}
          </div>
        ) : null}
      </div>
    </main>
  );
}