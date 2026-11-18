import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppBaseUrl } from "../app-url";

const originalNextAuthUrl = process.env.NEXTAUTH_URL;

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalNextAuthUrl === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = originalNextAuthUrl;
});

describe("getAppBaseUrl", () => {
  it("uses the canonical production URL instead of localhost", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXTAUTH_URL = "http://localhost:3000";

    expect(getAppBaseUrl("http://localhost:3000")).toBe(
      "https://equora-fdom.vercel.app"
    );
  });

  it("uses the production URL when no URL is configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NEXTAUTH_URL;

    expect(getAppBaseUrl()).toBe("https://equora-fdom.vercel.app");
  });

  it("preserves the configured localhost URL in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.NEXTAUTH_URL = "http://localhost:3000/";

    expect(getAppBaseUrl("http://localhost:3001")).toBe(
      "http://localhost:3000"
    );
  });
});
