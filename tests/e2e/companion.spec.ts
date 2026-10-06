import { expect, type Page, test } from "@playwright/test";
import { browse } from "./browse";

const stage = (page: Page) => page.locator("[data-stage]");
const companion = (page: Page) => page.getByRole("complementary", { name: /Dusk/ });
const log = (page: Page) => page.getByRole("log", { name: "Conversation with Dusk" });

/**
 * The conversation, readable. On phones it may have been folded to browse the page, so this reopens
 * it first (focusing the composer opens it; on desktop that is harmless).
 */
async function conversation(page: Page) {
  await page.locator("#dusk-input").click();
  await expect(companion(page)).toHaveAttribute("data-open", "true");
  return log(page);
}

/** Types into the composer and sends, opening the phone sheet first. */
async function ask(page: Page, text: string) {
  const input = page.locator("#dusk-input");
  await input.click();
  await input.fill(text);
  await input.press("Enter");
}

const chip = (page: Page, name: string | RegExp) =>
  companion(page).getByRole("button", { name, exact: typeof name === "string" });

let visitor = 0;

test.beforeEach(async ({ page }, info) => {
  // Each test is its own visitor: the chat is rate-limited per IP, and every test shares one server
  visitor += 1;
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.${info.workerIndex % 250}.${visitor % 250}`,
  });
  // instant scrolling makes "where did the page land" deterministic
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
});

test("Dusk greets the visitor with suggestions", async ({ page }) => {
  await expect(await conversation(page)).toContainText(
    "I'm Dusk, and I keep the record of Felistas",
  );
  await expect(chip(page, "I'm a recruiter")).toBeVisible();
});

test("asking for projects drives the page and shows the tool line", async ({ page }) => {
  await ask(page, "show projects");
  await expect(stage(page)).toHaveAttribute("data-section", "projects");
  await expect(stage(page)).toHaveAttribute("data-shape", "cube");
  const convo = await conversation(page);
  await expect(convo).toContainText('navigate("projects")');
  await expect(convo).toContainText("projects on record");
});

test("a chip opens a project and selects it", async ({ page }) => {
  await ask(page, "show projects");
  await expect(stage(page)).toHaveAttribute("data-section", "projects");
  await conversation(page);
  await chip(page, "Tell me about Aegis").click();
  await expect(page.locator("#project-detail")).toContainText("final-year project");
  await expect(await conversation(page)).toContainText('open_project("aegis")');
});

test("the resume downloads and its card stays in the conversation", async ({ page }) => {
  const download = page.waitForEvent("download");
  await ask(page, "download resume");
  expect((await download).suggestedFilename()).toBe("felistas-resume.pdf");
  await expect((await conversation(page)).getByRole("link", { name: "Download" })).toHaveAttribute(
    "href",
    "/resume/felistas-resume.pdf",
  );
});

test("the chat contact flow ends in a draft that only the visitor sends", async ({ page }) => {
  let sent: Record<string, unknown> | null = null;
  await page.route("**/api/contact", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true } });
  });

  await ask(page, "I'd like to contact Felistas");
  await expect(stage(page)).toHaveAttribute("data-section", "contact");
  await expect(await conversation(page)).toContainText("Which email address");
  await ask(page, "not an email");
  await expect(log(page)).toContainText("doesn't look like an email");
  await ask(page, "ada@acme.com");
  await expect(log(page)).toContainText("What would you like to say");
  await ask(page, "Let's talk about a senior backend role.");

  const draft = page.getByRole("region", { name: "Draft message" });
  await expect(draft).toContainText("ada@acme.com");
  expect(sent).toBeNull(); // nothing goes out until Send
  await draft.getByRole("button", { name: "Send" }).click();
  await expect(companion(page)).toContainText("Sent to Felistas");
  expect(sent).toMatchObject({
    replyTo: "ada@acme.com",
    message: "Let's talk about a senior backend role.",
    website: "",
  });
  expect(typeof (sent as unknown as { elapsedMs: number }).elapsedMs).toBe("number");
});

test("the contact letter validates the email and hands a draft to Dusk", async ({ page }) => {
  await browse(page);
  await page.evaluate(() => {
    const sc = document.querySelector<HTMLElement>("[data-scroller]")!;
    sc.scrollTop = sc.querySelector<HTMLElement>('[data-sec="contact"]')!.offsetTop;
  });
  await page.locator("#letter-name").fill("Ada");
  await page.locator("#letter-company").fill("Acme");
  await page.getByRole("button", { name: "Hand it to Dusk" }).click();
  await expect(page.locator("#letter-error")).toContainText("Add an email address");

  await page.locator("#letter-email").fill("ada@acme.com");
  await page.getByRole("button", { name: "Hand it to Dusk" }).click();
  const draft = page.getByRole("region", { name: "Draft message" });
  await expect(draft).toContainText("Hi Felistas, I'm Ada from Acme.");
  await draft.getByRole("button", { name: "Cancel" }).click();
  await expect(draft).toHaveCount(0);
});

const toContact = async (page: Page) => {
  await browse(page);
  await page.evaluate(() => {
    const sc = document.querySelector<HTMLElement>("[data-scroller]")!;
    sc.scrollTop = sc.querySelector<HTMLElement>('[data-sec="contact"]')!.offsetTop;
  });
};

test("send via email checks the letter, sends it, and confirms", async ({ page }) => {
  let sent: Record<string, unknown> | null = null;
  await page.route("**/api/contact", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true, confirmed: true } });
  });
  await toContact(page);
  const send = page.getByRole("button", { name: "Send via email" });

  await send.click();
  await expect(page.locator("#letter-error")).toContainText("Add your name");
  await expect(page.locator("#letter-name")).toBeFocused();

  await page.locator("#letter-name").fill("Ada");
  await page.locator("#letter-email").fill("not-an-email");
  await send.click();
  await expect(page.locator("#letter-error")).toContainText("Add an email address");
  expect(sent).toBeNull();

  await page.locator("#letter-email").fill("ada@acme.com");
  await page.locator("#letter-topic").fill("a backend role");
  await send.click();
  await expect(
    page.getByRole("status").filter({ hasText: "confirmation is on its way" }),
  ).toHaveCount(2);
  expect(sent).toMatchObject({
    replyTo: "ada@acme.com",
    name: "Ada",
    topic: "a backend role",
    message: "Hi Felistas, I'm Ada. I'd like to talk about a backend role.",
    website: "",
  });
  await expect(page.locator("#letter-name")).toHaveValue("");
});

test("send via email shows the server's reason when sending fails", async ({ page }) => {
  await page.route("**/api/contact", (route) =>
    route.fulfill({
      status: 503,
      json: {
        ok: false,
        error: "not_configured",
        message: "Sending is not set up yet. Email Felistas directly instead.",
      },
    }),
  );
  await toContact(page);
  await page.locator("#letter-name").fill("Ada");
  await page.locator("#letter-email").fill("ada@acme.com");
  await page.getByRole("button", { name: "Send via email" }).click();
  await expect(page.locator("#letter-error")).toContainText("Sending is not set up yet");
  await expect(page.locator("#letter-name")).toHaveValue("Ada");
});

test("Ask Dusk links send the question to the conversation", async ({ page }) => {
  await browse(page);
  await page.evaluate(() => {
    const sc = document.querySelector<HTMLElement>("[data-scroller]")!;
    sc.scrollTop = sc.querySelector<HTMLElement>('[data-sec="projects"]')!.offsetTop;
  });
  await page.getByRole("button", { name: /Ask Dusk about PhishGuard/ }).click();
  // asking opens the phone chat; the answer may wait on the chat runtime's first load
  await expect(async () => {
    const convo = await conversation(page);
    await expect(convo).toContainText("Tell me about PhishGuard", { timeout: 1_000 });
    await expect(convo).toContainText("PhishGuard is phishing email detection", { timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
});

test("start over returns to the greeting", async ({ page }) => {
  await ask(page, "what's the stack?");
  await expect(stage(page)).toHaveAttribute("data-section", "about");
  await expect(await conversation(page)).toContainText("daily stack");
  await companion(page).getByRole("button", { name: "Start over" }).click();
  await expect(log(page)).not.toContainText("daily stack");
  await expect(log(page)).toContainText("Who's visiting today?");
});

test("start over mid-reply brings the suggestions back and stops the sphere speaking", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await ask(page, "who is Felistas?");
  await companion(page).getByRole("button", { name: "Start over" }).click();
  const sheet = await conversation(page);
  await expect(sheet).toContainText("Who's visiting today?");
  await expect(chip(page, "I'm a recruiter")).toBeVisible();
  await expect(companion(page).getByText("Listening")).toBeVisible();
});

test("the intro resume link is a plain download, not a chat request", async ({ page }) => {
  await browse(page);
  const link = page.locator('[data-sec="home"]').getByRole("link", { name: "Download resume" });
  await expect(link).toHaveAttribute("href", "/resume/felistas-resume.pdf");
  await expect(link).toHaveAttribute("download", "felistas-resume.pdf");
});

test("a live answer shows its sources, and a source opens where it lives", async ({
  page,
  isMobile,
}) => {
  // A live (Gemini) reply as the server streams it; CI has no key, so the route is mocked
  const chunks = [
    { type: "start", messageMetadata: { mode: "live" } },
    { type: "text-start", id: "t" },
    {
      type: "text-delta",
      id: "t",
      delta: "Aegis matches faces from CCTV footage against a watch list.",
    },
    { type: "text-end", id: "t" },
    {
      type: "finish",
      messageMetadata: {
        mode: "live",
        flow: null,
        sources: [
          {
            id: "project:aegis:card",
            title: "Projects · Aegis",
            section: "projects",
            entityId: "aegis",
          },
        ],
      },
    },
  ];
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
      body: [...chunks.map((c) => JSON.stringify(c)), "[DONE]"]
        .map((line) => `data: ${line}\n\n`)
        .join(""),
    }),
  );

  await ask(page, "What does Aegis do?");
  const convo = await conversation(page);
  await expect(convo).toContainText("Aegis matches faces");
  // phones tap: a mouse click would leave a hover over the list once the sheet folds away
  const source = convo.getByRole("button", { name: /Projects · Aegis/ });
  await (isMobile ? source.tap() : source.click());
  await expect(stage(page)).toHaveAttribute("data-section", "projects");
  await expect(page.locator("#project-detail")).toContainText("Aegis");
});

test.describe("on phones", () => {
  test.skip(({ isMobile }) => !isMobile, "the chat-first view is phone-only");

  test("phones start in the chat, with questions to tap and the page waiting", async ({ page }) => {
    const chat = companion(page);
    await expect(chat).toHaveAttribute("data-open", "true");
    await expect(page.locator("main")).toBeHidden();
    await expect(chat.getByText("Try asking")).toBeVisible();
    await expect(chip(page, "Show projects")).toBeVisible();
  });

  test("Dusk shows what it opens inline, and the page follows behind", async ({ page }) => {
    const chat = companion(page);
    await chip(page, "Show projects").tap();
    // the answer may wait on the chat runtime's first load, which is slow under a busy test run
    await expect(stage(page)).toHaveAttribute("data-section", "projects", { timeout: 10_000 });
    await expect(stage(page)).toHaveAttribute("data-shape", "cube");
    await expect(chat).toHaveAttribute("data-open", "true");

    await chat.locator('[data-inline="projects"]').getByRole("button", { name: /Aegis/ }).tap();
    const project = chat.locator('[data-inline="project"]').last();
    await expect(project).toContainText("Aegis", { timeout: 10_000 });
    // after the first answer the suggestions become a row of chips
    await expect(chat.getByText("Try asking")).toBeHidden();

    await project.getByRole("button", { name: "See it on the page" }).tap();
    await expect(chat).not.toHaveAttribute("data-open");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("#project-detail")).toContainText("Aegis");
  });

  test("Browse folds the chat to a bar, and the composer brings it back", async ({ page }) => {
    const chat = companion(page);
    await chat.getByRole("button", { name: "Browse the page" }).tap();
    await expect(chat).not.toHaveAttribute("data-open");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("main")).not.toHaveAttribute("inert");
    await page.locator("#dusk-input").tap();
    await expect(chat).toHaveAttribute("data-open", "true");
    await expect(page.locator("main")).toHaveAttribute("inert", "");
  });
});
