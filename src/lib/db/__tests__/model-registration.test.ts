import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import "../connect";

describe("database model registration", () => {
  it("registers models referenced by populated fields", () => {
    expect(mongoose.modelNames()).toContain("Group");
  });

  it("registers the password hash as a hidden user field", () => {
    const userModel = mongoose.model("User");
    const passwordHashPath = userModel.schema.path("passwordHash");

    expect(passwordHashPath).toBeDefined();
    expect(passwordHashPath?.options.select).toBe(false);
  });
});
