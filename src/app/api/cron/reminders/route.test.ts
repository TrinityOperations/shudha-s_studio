import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ serverEnv: vi.fn(), runReminderJob: vi.fn() }));
vi.mock("@/lib/env", () => ({ serverEnv: mocks.serverEnv }));
vi.mock("@/lib/booking/reminders", () => ({ runReminderJob: mocks.runReminderJob }));

import { GET, POST } from "./route";

const SECRET = "0123456789abcdef0123";
const url = "http://localhost:3000/api/cron/reminders";

beforeEach(() => {
  mocks.serverEnv.mockReturnValue({ CRON_SECRET: SECRET });
  mocks.runReminderJob.mockReset().mockResolvedValue({ claimed: 2, sent: 2, failed: 0 });
});

describe("reminders route", () => {
  it("returns 503 when CRON_SECRET is unset", async () => {
    mocks.serverEnv.mockReturnValue({ CRON_SECRET: undefined });
    const res = await POST(
      new Request(url, { method: "POST", headers: { authorization: `Bearer ${SECRET}` } }),
    );
    expect(res.status).toBe(503);
    expect(mocks.runReminderJob).not.toHaveBeenCalled();
  });

  it("returns 401 without the right bearer", async () => {
    expect((await POST(new Request(url, { method: "POST" }))).status).toBe(401);
    expect(
      (await GET(new Request(url, { headers: { authorization: "Bearer nope" } }))).status,
    ).toBe(401);
    expect(mocks.runReminderJob).not.toHaveBeenCalled();
  });

  it("runs the job and returns its counts on POST and GET", async () => {
    const res = await POST(
      new Request(url, { method: "POST", headers: { authorization: `Bearer ${SECRET}` } }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ claimed: 2, sent: 2, failed: 0 });
    const get = await GET(new Request(url, { headers: { authorization: `Bearer ${SECRET}` } }));
    expect(get.status).toBe(200);
    expect(mocks.runReminderJob).toHaveBeenCalledTimes(2);
  });
});
