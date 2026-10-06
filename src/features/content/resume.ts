import "server-only";

import { cache } from "react";

// The resume lives outside this repo (content/profile.md resume.source, or RESUME_URL), so it can be
// replaced without a deploy. The site serves it at /resume/<file> and reads its size and date live.

/** Seconds a fetched resume (and its details) is reused before the source is checked again */
export const RESUME_REVALIDATE = 1800;

export type ResumeMeta = {
  /** e.g. "271 KB" */
  size?: string;
  /** e.g. "Oct 2026" */
  updated?: string;
  /** ISO date of the last change, for the sitemap */
  changedAt?: string;
};

/** "271 KB", or "1.2 MB" from a megabyte up. */
export function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const formatMonth = (date: Date) =>
  date.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

/** Owner, repo, branch and path of a raw.githubusercontent.com URL; null for any other URL. */
export function githubRawFile(
  url: string,
): { owner: string; repo: string; ref: string; path: string } | null {
  const { hostname, pathname } = new URL(url);
  if (hostname !== "raw.githubusercontent.com") return null;
  const [owner, repo, ref, ...rest] = pathname.split("/").filter(Boolean);
  return owner && repo && ref && rest.length ? { owner, repo, ref, path: rest.join("/") } : null;
}

/** The PDF from its source, through Next's data cache. Throws when the source can't be read. */
export async function fetchResume(source: string): Promise<Response> {
  const res = await fetch(source, { next: { revalidate: RESUME_REVALIDATE } });
  if (!res.ok) throw new Error(`resume source answered ${res.status}`);
  return res;
}

/** When the file last changed: the last commit that touched it on GitHub, else Last-Modified. */
async function lastChanged(source: string, res: Response): Promise<Date | null> {
  const gh = githubRawFile(source);
  if (gh) {
    const api = new URL(`https://api.github.com/repos/${gh.owner}/${gh.repo}/commits`);
    api.search = new URLSearchParams({ path: gh.path, sha: gh.ref, per_page: "1" }).toString();
    const commits = await fetch(api, {
      headers: { accept: "application/vnd.github+json" },
      next: { revalidate: RESUME_REVALIDATE },
    });
    if (!commits.ok) return null;
    const [latest] = (await commits.json()) as { commit?: { committer?: { date?: string } } }[];
    const date = latest?.commit?.committer?.date;
    return date ? new Date(date) : null;
  }
  const header = res.headers.get("last-modified");
  return header ? new Date(header) : null;
}

/**
 * The size and date shown on the resume card. Best effort: anything that can't be read is left out,
 * and the download still works.
 */
export const resumeMeta = cache(async (source: string | undefined): Promise<ResumeMeta> => {
  if (!source) return {};
  try {
    const res = await fetchResume(source);
    const bytes = (await res.arrayBuffer()).byteLength;
    const changed = await lastChanged(source, res).catch(() => null);
    const valid = changed && !Number.isNaN(changed.getTime()) ? changed : null;
    return {
      size: formatSize(bytes),
      ...(valid ? { updated: formatMonth(valid), changedAt: valid.toISOString() } : {}),
    };
  } catch {
    return {};
  }
});
