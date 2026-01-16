import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ⚠️ MOVE THESE TO ENV IN REAL APPS. Hardcoding works but rotate if leaked.
cloudinary.config({
  cloud_name: "dyrklr6et",
  api_key: "789259238222875",
  api_secret: "eHiAzAdv_dIw-2mjxRJ0eS0-WfU",
});

export async function POST(req) {
  try {
    const { dataUrl } = await req.json();

    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "Invalid image dataUrl" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Upload the base64 data URL directly to Cloudinary (they accept dataURIs)
    const uploaded = await cloudinary.uploader.upload(dataUrl, {
      folder: "bulk_access_cards",
      resource_type: "image",
      overwrite: false,
      use_filename: true,
      unique_filename: true,
    });

    return new Response(JSON.stringify({ url: uploaded.secure_url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Upload failed:", e);
    return new Response(
      JSON.stringify({ error: "Upload failed", details: e?.message || String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}