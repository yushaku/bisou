import { env } from "cloudflare:workers";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { call, paired, resetDb, user, waitForBackground, type TestUser } from "./helpers";
import { decrypt, device, mockPush, subscribe } from "./push-helpers";

const NOW = Date.parse("2026-11-21T09:00:00Z");

const request = (who: TestUser, method: string, path: string, body?: unknown) =>
  call(method, `/api/journal${path}`, { cookie: who.cookie, body });

async function createEntry(who: TestUser) {
  const response = await request(who, "POST", "", {
    date: "2026-11-20",
    text: "PRIVATE ENTRY",
    photoIds: [],
  });
  expect(response.status).toBe(201);
  return (await response.json<{ entry: { id: string } }>()).entry.id;
}

async function comment(who: TestUser, id: string, text: string) {
  const response = await request(who, "POST", `/${id}/comments`, { text });
  expect(response.status).toBe(201);
  return (await response.json<{ comment: { id: string; text: string } }>()).comment;
}

beforeEach(async () => {
  await resetDb();
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});

afterEach(async () => {
  await waitForBackground();
  vi.restoreAllMocks();
});

it("journal-comments AC1: other couples and unpaired users cannot access comments", async () => {
  const { a } = await paired();
  const id = await createEntry(a);
  const { id: commentId } = await comment(a, id, "Private reply");
  const outsider = await user("Hoa");
  const other = await user("Lan");
  const lone = await user("Lone");
  const created = await call("POST", "/api/couple", { cookie: outsider.cookie });
  const { couple } = await created.json<{ couple: { pendingCode: { code: string } } }>();
  expect(
    (
      await call("POST", "/api/couple/join", {
        cookie: other.cookie,
        body: { code: couple.pendingCode.code },
      })
    ).status,
  ).toBe(200);

  for (const [method, suffix, body] of [
    ["GET", "/comments"],
    ["POST", "/comments", { text: "Reply" }],
    ["PUT", `/comments/${commentId}`, { text: "Edit" }],
    ["DELETE", `/comments/${commentId}`],
    ["GET", ""],
  ] as const) {
    const foreign = await request(outsider, method, `/${id}${suffix}`, body);
    const missing = await request(outsider, method, `/missing${suffix}`, body);
    expect(foreign.status).toBe(404);
    expect(await foreign.json()).toEqual(await missing.json());
    expect((await request(lone, method, `/${id}${suffix}`, body)).status).toBe(404);
  }
});

it("journal-comments AC3, AC4, AC5: trim, validate, list, count and protect authorship", async () => {
  const { a, b } = await paired();
  const id = await createEntry(a);
  const path = `/${id}/comments`;
  for (const text of [" ", "x".repeat(1001), "\u0000x"]) {
    expect((await request(b, "POST", path, { text })).status).toBe(400);
  }
  const maxText = "🙂".repeat(1000);
  const first = await comment(b, id, `  ${maxText}  `);
  expect(first.text).toBe(maxText);
  vi.mocked(Date.now).mockReturnValue(NOW + 1);
  const second = await comment(a, id, "Our reply");
  const editPath = `${path}/${first.id}`;
  expect((await request(a, "PUT", editPath, { text: "Another reply" })).status).toBe(403);
  expect((await request(a, "DELETE", editPath)).status).toBe(403);
  expect((await request(b, "PUT", editPath, { text: " " })).status).toBe(400);
  expect((await request(b, "PUT", editPath, { text: "x".repeat(1001) })).status).toBe(400);
  expect((await request(b, "PUT", editPath, { text: "  Changed  " })).status).toBe(200);
  expect(await (await request(a, "GET", path)).json()).toEqual({
    comments: [
      { id: first.id, text: "Changed", authorId: b.id, authorName: "Minh", createdAt: NOW },
      { id: second.id, text: "Our reply", authorId: a.id, authorName: "An", createdAt: NOW + 1 },
    ],
  });
  expect(await (await request(b, "GET", "")).json()).toMatchObject({ entries: [{ id, commentCount: 2 }] });
  expect(await (await request(b, "GET", `/${id}`)).json()).toMatchObject({
    entry: { id, commentCount: 2 },
  });
  expect((await request(b, "DELETE", editPath)).status).toBe(200);
  expect(await (await request(a, "GET", "")).json()).toMatchObject({ entries: [{ id, commentCount: 1 }] });
});

it("journal-comments AC2, AC6: ordinary, received-wish and closed-note entries accept comments and cascade on deletion", async () => {
  const { a, b, couple } = await paired();
  const ordinary = await createEntry(a);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO notes
      (id, couple_id, writer_id, recipient_id, happened, feel, need, hope, line, created_at, updated_at, sent_at, opened_at, closed_at)
      VALUES ('closed-note', ?, ?, ?, 'happened', 'feel', 'need', 'hope', 'closing message', ?, ?, ?, ?, ?)`,
    ).bind(couple.id, a.id, b.id, NOW, NOW, NOW, NOW, NOW),
    env.DB.prepare(
      `INSERT INTO journal_entries
      (id, couple_id, author_id, entry_date, body, created_at, updated_at, source, note_id)
      VALUES ('received', ?, ?, '2026-11-20', 'wish received', ?, ?, 'wish', NULL),
      ('closed', ?, ?, '2026-11-20', '', ?, ?, 'partner', 'closed-note')`,
    ).bind(couple.id, a.id, NOW, NOW, couple.id, a.id, NOW, NOW),
  ]);
  for (const id of [ordinary, "received", "closed"]) await comment(b, id, "Same permissions");
  expect((await request(a, "DELETE", `/${ordinary}`)).status).toBe(200);
  expect((await request(a, "DELETE", "/received")).status).toBe(200);
  expect((await call("DELETE", "/api/notes/closed-note", { cookie: b.cookie })).status).toBe(200);
  expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM journal_comments").first("count")).toBe(0);
  expect((await request(b, "GET", "/closed/comments")).status).toBe(404);
});

it("notifications AC25: create pushes only to the partner's enabled devices, with a private entry link", async () => {
  const { a, b } = await paired();
  const id = await createEntry(a);
  await waitForBackground();
  await call("PATCH", "/api/me", { cookie: b.cookie, body: { locale: "en" } });
  const author = await device("author");
  const recipient = await device("recipient");
  await subscribe(a, author);
  await subscribe(b, recipient);
  await subscribe(b, await device("off", { journal: false, reminders: true }));
  const push = mockPush();
  const { id: commentId } = await comment(a, id, "PRIVATE COMMENT");
  await waitForBackground();
  expect(push.sent.map((message) => message.endpoint)).toEqual([recipient.body.endpoint]);
  expect(await decrypt(push.sent[0]!.body, recipient)).toEqual({
    title: "An commented on a journal entry",
    url: `/journal?entry=${id}`,
    tag: "journal",
  });
  const editPath = `/${id}/comments/${commentId}`;
  expect((await request(a, "PUT", editPath, { text: "EDITED SECRET" })).status).toBe(200);
  expect((await request(a, "DELETE", editPath)).status).toBe(200);
  await waitForBackground();
  expect(push.sent).toHaveLength(1);

  await comment(b, id, "PRIVATE REPLY");
  await waitForBackground();
  expect(push.sent[1]!.endpoint).toBe(author.body.endpoint);
  expect(await decrypt(push.sent[1]!.body, author)).toEqual({
    title: "Minh vừa bình luận bài nhật ký",
    url: `/journal?entry=${id}`,
    tag: "journal",
  });
});
