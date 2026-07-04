import { describe, it, expect } from "vitest";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./authSchemas";

describe("authSchemas", () => {
  it("accepts valid login input", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "x" }).success,
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      loginSchema.safeParse({ email: "nope", password: "x" }).success,
    ).toBe(false);
  });

  it("requires a password", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "" }).success,
    ).toBe(false);
  });

  it("signup requires an 8+ character password", () => {
    expect(
      signupSchema.safeParse({ email: "a@b.com", password: "short" }).success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({ email: "a@b.com", password: "longenough" })
        .success,
    ).toBe(true);
  });

  it("signup allows an optional name", () => {
    expect(
      signupSchema.safeParse({ email: "a@b.com", password: "longenough" })
        .success,
    ).toBe(true);
  });

  it("forgot-password wants a well-formed email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(
      true,
    );
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(
      false,
    );
  });

  it("reset-password enforces the signup strength rule", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "short", confirm: "short" })
        .success,
    ).toBe(false);
  });

  it("reset-password requires the confirmation to match", () => {
    const mismatch = resetPasswordSchema.safeParse({
      password: "longenough",
      confirm: "different1",
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.error.issues[0]?.path).toEqual(["confirm"]);
    }
    expect(
      resetPasswordSchema.safeParse({
        password: "longenough",
        confirm: "longenough",
      }).success,
    ).toBe(true);
  });
});
