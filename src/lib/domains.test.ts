import { describe, expect, it } from "vitest";
import { extractDomainsFromInput, inferCompetitorName, mergeCompetitorDomains, normalizeDomain } from "@/lib/domains";

describe("domains helpers", () => {
  it("normalizes websites and emails into a plain domain", () => {
    expect(normalizeDomain("https://www.Acme.com/pricing")).toBe("acme.com");
    expect(normalizeDomain("Marketing <hello@updates.acme.com>")).toBe("updates.acme.com");
    expect(normalizeDomain("hello@news.brand.co.uk")).toBe("news.brand.co.uk");
  });

  it("extracts and de-duplicates domains from free text input", () => {
    expect(extractDomainsFromInput("acme.com, https://www.acme.com\nmail.acme.com")).toEqual([
      "acme.com",
      "mail.acme.com",
    ]);
  });

  it("merges website-derived domains with manual domains", () => {
    expect(
      mergeCompetitorDomains({
        website: "https://www.acme.com",
        domains: ["news.acme.com", "acme.com"],
      }),
    ).toEqual(["acme.com", "news.acme.com"]);
  });

  it("infers a readable competitor name from sender information", () => {
    expect(inferCompetitorName({ senderName: "Acme Growth" })).toBe("Acme Growth");
    expect(inferCompetitorName({ senderDomain: "news.brand-studio.com" })).toBe("Brand Studio");
  });
});
