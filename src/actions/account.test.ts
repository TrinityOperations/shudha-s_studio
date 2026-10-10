import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireOwner: vi.fn(), updateUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { updateUser: mocks.updateUser } }),
}));

import { changePassword } from "./account";

beforeEach(() => {
  mocks.requireOwner.mockResolvedValue({ id: "owner" });
  mocks.updateUser.mockResolvedValue({ error: null });
});

describe("changePassword", () => {
  it("needs eight characters and a matching repeat, before auth", async () => {
    const short = await changePassword({ password: "short", confirm: "short" });
    if (short.ok) throw new Error("expected failure");
    expect(short.fieldErrors?.password).toEqual(["errors.passwordShort"]);
    const mismatch = await changePassword({ password: "longenough", confirm: "different" });
    if (mismatch.ok) throw new Error("expected failure");
    expect(mismatch.fieldErrors?.confirm).toEqual(["errors.passwordMismatch"]);
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("updates the signed-in user's password and reports a failure", async () => {
    expect(await changePassword({ password: "longenough", confirm: "longenough" })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "longenough" });
    mocks.updateUser.mockResolvedValue({ error: { message: "weak" } });
    expect(await changePassword({ password: "longenough", confirm: "longenough" })).toMatchObject({
      ok: false,
      error: "errors.passwordChangeFailed",
    });
  });
});
