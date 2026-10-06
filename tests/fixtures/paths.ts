import path from "node:path";

/** Frozen sample content: unit tests run against it, so they don't change when content/ does */
export const FIXTURE_CONTENT = path.join(process.cwd(), "tests", "fixtures", "content");
