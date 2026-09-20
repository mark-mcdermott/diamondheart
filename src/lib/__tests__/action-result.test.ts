import { describe, it, expect, vi, beforeEach } from "vitest";

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));

import { surfaceErrors } from "@/lib/action-result";

beforeEach(() => toastError.mockClear());

describe("surfaceErrors", () => {
  it("says nothing when the action succeeds", async () => {
    const result = await surfaceErrors(Promise.resolve({ success: true }));
    expect(result.success).toBe(true);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("shows the action's own message when it fails", async () => {
    await surfaceErrors(Promise.resolve({ success: false, error: "Category already exists" }));
    expect(toastError).toHaveBeenCalledWith("Category already exists");
  });

  it("falls back when the action fails without a message", async () => {
    await surfaceErrors(Promise.resolve({ success: false }));
    expect(toastError).toHaveBeenCalledWith("Something went wrong. Please try again.");
  });

  it("treats a blank message as no message", async () => {
    await surfaceErrors(Promise.resolve({ success: false, error: "   " }));
    expect(toastError).toHaveBeenCalledWith("Something went wrong. Please try again.");
  });

  it("accepts a caller-supplied fallback", async () => {
    await surfaceErrors(Promise.resolve({ success: false }), "Could not save the meal.");
    expect(toastError).toHaveBeenCalledWith("Could not save the meal.");
  });

  it("returns the result so callers can still branch", async () => {
    const ok = await surfaceErrors(Promise.resolve({ success: true, id: "abc" } as never));
    expect((ok as { id: string }).id).toBe("abc");
  });

  it("does not swallow a thrown error", async () => {
    // redirect() works by throwing; catching here would break every redirecting action.
    const boom = new Error("NEXT_REDIRECT");
    await expect(surfaceErrors(Promise.reject(boom))).rejects.toThrow("NEXT_REDIRECT");
    expect(toastError).not.toHaveBeenCalled();
  });
});
