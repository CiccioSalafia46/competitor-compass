import { expect, test } from "../playwright-fixture";
import { mockApp, signInThroughUi } from "./helpers/mockApp";

test("redirects anonymous users away from protected billing routes", async ({ page }) => {
  await page.goto("/settings/billing");
  await page.waitForURL("**/auth");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("sign-in redirects to the dashboard and renders the server snapshot", async ({ page }) => {
  const state = await mockApp(page, {
    unreadAlertCount: 3,
    dashboardSnapshot: {
      workspaceId: "workspace-1",
      workspaceName: "Acme Ops",
      gmailConnected: true,
      unreadAlertCount: 3,
      stats: {
        newsletters: 42,
        competitors: 4,
        completedAnalyses: 9,
        metaAds: 7,
        activeAds: 3,
        inboxItems: 18,
        insightCount: 2,
      },
      usage: {
        competitors: 4,
        newsletters_this_month: 18,
        analyses_this_month: 9,
        seats_used: 2,
      },
      limits: {
        competitors: 10,
        newsletters_per_month: 2000,
        analyses_per_month: 500,
      },
      recentInbox: [],
      competitors: [
        { id: "competitor-1", name: "Rival A", website: "https://rival-a.com", is_monitored: true },
      ],
      decisionModel: {
        dailyHighlights: [
          {
            title: "Competitor activity accelerated",
            detail: "Tracked newsletter volume is up this week.",
            tone: "warning",
          },
        ],
        prioritizedInsights: [
          {
            id: "insight-1",
            workspace_id: "workspace-1",
            category: "pricing",
            title: "Pricing pressure increased",
            what_is_happening: "Competitors are discounting more aggressively.",
            why_it_matters: "This can erode conversion and pricing power.",
            strategic_implication: "Review your price-value narrative before the next campaign cycle.",
            recommended_response:
              "Immediate: review current hero pricing\nNext 30 days: test a stronger value stack\nMeasure: CVR and margin",
            confidence: 0.91,
            supporting_evidence: [{ label: "Discount depth", detail: "Average discount reached 25%" }],
            affected_competitors: ["Rival A"],
            source_type: "cross_channel",
            priority_level: "high",
            created_at: "2026-04-06T09:00:00.000Z",
          },
        ],
        anomalies: [],
        competitorSummary: [{ competitor: "Rival A", newsletters: 12, ads: 3, promoRate: 0.5 }],
        recommendedActions: [
          {
            title: "Act on pricing pressure",
            detail: "Pressure is concentrated in the hero offer.",
            path: "/insights",
            priority: "critical",
            cta: "Open insight",
          },
        ],
      },
    },
  });

  await signInThroughUi(page);
  await page.waitForURL("**/dashboard");
  await expect.poll(() => state.functionCalls.filter((call) => call.includes("dashboard-snapshot")).length).toBeGreaterThan(0);

  await expect(page.getByText("Decision Engine")).toBeVisible();
  await expect(page.getByText("Competitor activity accelerated")).toBeVisible();
  await expect(page.getByText("Act on pricing pressure", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Prioritized insights" })).toBeVisible();
  await expect(page.getByText("Pricing pressure increased").first()).toBeVisible();
});

test("onboarding can create a workspace and advance to the Gmail step", async ({ page }) => {
  const state = await mockApp(page, {
    workspaces: [],
    appRoles: [],
    membershipRole: null,
  });

  await signInThroughUi(page);
  await page.waitForURL("**/onboarding");

  await page.getByRole("button", { name: /get started/i }).click();
  await page.getByLabel("Workspace name").fill("Decision Lab");
  await page.getByRole("button", { name: /create workspace/i }).click();

  await expect(page.getByText("Add your competitors")).toBeVisible();
  await page.getByPlaceholder("Company name").fill("Rival One");
  await page.getByRole("button", { name: /^Continue$/ }).click();

  await expect(page.getByRole("heading", { name: "Connect Gmail" })).toBeVisible();
  await expect(state.workspaces).toHaveLength(1);
  await expect(state.competitors).toHaveLength(1);
});

test("verified admins can start Gmail OAuth from onboarding", async ({ page }) => {
  await mockApp(page, {
    gmailAuthUrl: "https://example.com/oauth/mock-gmail",
  });

  await signInThroughUi(page);
  await page.goto("/onboarding");
  await expect(page.getByRole("button", { name: /get started/i })).toBeVisible();
  await page.getByRole("button", { name: /get started/i }).click();
  await expect(page.getByText("Add your competitors")).toBeVisible();
  await page.getByRole("button", { name: /skip for now/i }).click();
  await expect(page.getByRole("heading", { name: "Connect Gmail" })).toBeVisible();

  await Promise.all([
    page.waitForURL("https://example.com/oauth/mock-gmail"),
    page.getByRole("button", { name: /connect gmail/i }).click(),
  ]);
});

test("non-admin users are redirected away from billing", async ({ page }) => {
  await mockApp(page, {
    workspaces: [
      {
        id: "workspace-1",
        name: "Acme Ops",
        slug: "acme-ops",
        owner_id: "owner-2",
        created_at: "2026-04-06T09:00:00.000Z",
        updated_at: "2026-04-06T09:00:00.000Z",
      },
    ],
    membershipRole: "member",
    appRoles: ["viewer"],
  });

  await signInThroughUi(page);
  await page.goto("/settings/billing");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("admin billing view shows the active plan and opens the customer portal", async ({ page }) => {
  await mockApp(page, {
    billing: {
      subscribed: true,
      tier: "starter",
      price_id: "price_starter",
      subscription_end: "2026-05-01T00:00:00.000Z",
      cancel_at_period_end: false,
    },
    totalNewsletters: 120,
    newslettersThisMonth: 42,
    totalAnalyses: 64,
    analysesThisMonth: 17,
    seatsUsed: 2,
  });

  await signInThroughUi(page);
  await page.getByRole("button", { name: "Billing" }).click();

  await expect(page.getByRole("heading", { name: "Plans & Billing" })).toBeVisible();
  const manageSubscriptionButton = page.getByRole("button", { name: "Manage subscription" }).first();
  await expect(manageSubscriptionButton).toBeVisible();
  await expect(manageSubscriptionButton).toBeEnabled();
  await expect(page.getByText(/current billing period ends/i)).toBeVisible();

  const popupPromise = page.waitForEvent("popup");
  await manageSubscriptionButton.click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  await expect(popup).toHaveURL("https://example.com/mock-billing-portal");
}, 60_000);

test("non-platform-admin users do not see the admin panel entry point", async ({ page }) => {
  await mockApp(page, {
    isPlatformAdmin: false,
  });

  await signInThroughUi(page);
  await expect(page.getByRole("button", { name: "Admin Panel" })).toHaveCount(0);
});

test("platform admins can access the operational overview with real data cards", async ({ page }) => {
  const state = await mockApp(page, {
    isPlatformAdmin: true,
    adminOverview: {
      recentSignups: 5,
      totalUsers: 48,
      totalWorkspaces: 14,
      gmailConnections: 11,
      totalNewsletters: 1840,
      totalInsights: 214,
      totalCompetitors: 79,
      totalAnalyses: 612,
      totalMetaAds: 128,
      rateLimitHits: 3,
      recentActivity: [
        {
          id: "log-1",
          action: "workspace.deleted",
          entity_type: "workspace",
          entity_id: "workspace-44",
          created_at: "2026-04-06T08:45:00.000Z",
        },
      ],
      syncErrors: [],
    },
  });

  await signInThroughUi(page);
  await expect.poll(() => state.functionCalls.filter((call) => call.includes("admin-data")).length).toBeGreaterThan(0);
  const adminPanelButton = page.getByRole("button", { name: "Admin Panel" });
  await expect(adminPanelButton).toBeVisible();
  await adminPanelButton.click();

  await expect(page.getByRole("heading", { name: "Platform Overview" })).toBeVisible();
  await expect(page.getByText("48")).toBeVisible();
  await expect(page.getByText("workspace.deleted")).toBeVisible();
}, 60_000);
