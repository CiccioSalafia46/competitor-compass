import { describe, expect, it } from "vitest";
import { buildAuthRedirectUrl } from "@/hooks/useAuth";

describe("buildAuthRedirectUrl", () => {
  it("targets the redirect route for auth email links", () => {
    expect(buildAuthRedirectUrl("http://localhost:8080")).toBe("http://localhost:8080/redirect");
    expect(buildAuthRedirectUrl("http://localhost:8080/")).toBe("http://localhost:8080/redirect");
  });
});
