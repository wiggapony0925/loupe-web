import { describe, it, expect } from "vitest";
import { loginSchema, signupSchema } from "./authSchemas";

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
});
