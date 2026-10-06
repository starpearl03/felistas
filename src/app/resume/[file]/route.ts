import { loadSite } from "@/features/content/server";
import { fetchResume, RESUME_REVALIDATE } from "@/features/content/resume";

// The resume, served from our own origin so the download keeps its name, search engines index it
// under this domain, and the CSP stays first-party. The file itself lives at resume.source (or
// RESUME_URL) and is re-read at most every RESUME_REVALIDATE seconds.
export async function GET(_req: Request, ctx: RouteContext<"/resume/[file]">) {
  const { file } = await ctx.params;
  const { resume } = (await loadSite()).profile;
  if (!resume.source || file !== resume.file) return new Response("Not found", { status: 404 });

  let res: Response;
  try {
    res = await fetchResume(resume.source);
  } catch {
    return new Response("The resume is unavailable right now. Please try again shortly.", {
      status: 502,
      headers: { "cache-control": "no-store" },
    });
  }

  return new Response(res.body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${resume.file}"`,
      "cache-control": `public, max-age=0, s-maxage=${RESUME_REVALIDATE}, stale-while-revalidate=86400`,
      "x-robots-tag": "index",
    },
  });
}
