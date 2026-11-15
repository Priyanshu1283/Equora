import { describe, expect, it } from "vitest";
import { registerUserSchema } from "../index";

describe("registerUserSchema", () => {
  it("accepts valid account details and normalizes whitespace", () => {
    expect(
      registerUserSchema.parse({
        name: "  Test User  ",
        email: "  test@example.com ",
        password: "secure-password",
      })
    ).toEqual({
      name: "Test User",
      email: "test@example.com",
      password: "secure-password",
    });
  });

  it("rejects short passwords and passwords exceeding bcrypt's byte limit", () => {
    expect(
      registerUserSchema.safeParse({
        name: "Test User",
        email: "test@example.com",
        password: "short",
      }).success
    ).toBe(false);

    expect(
      registerUserSchema.safeParse({
        name: "Test User",
        email: "test@example.com",
        password: "é".repeat(37),
      }).success
    ).toBe(false);
  });
});
