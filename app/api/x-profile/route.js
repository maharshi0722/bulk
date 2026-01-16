export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const username = (searchParams.get("username") || "").replace(/^@+/, "").trim();

    if (!username) {
      return new Response(JSON.stringify({ error: "Missing username" }), { status: 400 });
    }

    // ⚠️ Rotate this token (you leaked it). Hardcoded server-only example:
    const token =
      "AAAAAAAAAAAAAAAAAAAAAAFd6wEAAAAAcGe4kgM7RsILKNPx5UQhihUxMYs%3D5UtM87xJCmadTE7ayk6Mnqxg62xz5xkx7gscEuGvUeoTVopdZR";

    const url =
      `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}` +
      `?user.fields=profile_image_url,name,username,verified,public_metrics`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data?.detail || "X API error", raw: data }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const u = data?.data;
    return new Response(
      JSON.stringify({
        id: u?.id,
        name: u?.name,
        username: u?.username,
        verified: !!u?.verified,
        profile_image_url: u?.profile_image_url,
        metrics: u?.public_metrics || null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "Unexpected server error" }), { status: 500 });
  }
}
