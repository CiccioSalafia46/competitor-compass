import { describe, expect, it } from "vitest";
import { parseClientEnv } from "@/lib/env";

describe("parseClientEnv", () => {
  it("reads the required public Supabase variables", () => {
    const env = parseClientEnv({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      VITE_SUPABASE_PROJECT_ID: "project-id",
    });

    expect(env).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "publishable-key",
      supabaseProjectId: "project-id",
    });
  });

  it("throws when a required variable is missing", () => {
    expect(() =>
      parseClientEnv({
        VITE_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrow('Missing required environment variable "VITE_SUPABASE_PUBLISHABLE_KEY"');
  });
});
