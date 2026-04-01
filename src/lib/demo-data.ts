import type { NewsletterInboxItem } from "@/types/gmail";

export const DEMO_NEWSLETTERS: Omit<NewsletterInboxItem, "id" | "workspace_id" | "created_at" | "imported_at">[] = [
  {
    gmail_connection_id: null,
    gmail_message_id: "demo-001",
    from_email: "newsletter@competitorA.com",
    from_name: "Acme SaaS",
    subject: "🚀 New Feature Drop: AI-Powered Analytics Dashboard",
    html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a1a;">Introducing AI Analytics</h1>
      <p>We're excited to announce our new AI-powered analytics dashboard — built to help you make smarter decisions, faster.</p>
      <h2>What's New</h2>
      <ul>
        <li><strong>Predictive Insights</strong> — See trends before they happen</li>
        <li><strong>Natural Language Queries</strong> — Ask questions in plain English</li>
        <li><strong>Custom Dashboards</strong> — Build reports in minutes</li>
      </ul>
      <p>🎉 <strong>Launch offer: Get 30% off</strong> your first 3 months with code <code>AI30LAUNCH</code>. Expires March 31, 2026.</p>
      <a href="#" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Try AI Analytics Free →</a>
      <p style="margin-top: 24px; font-size: 12px; color: #666;">You're receiving this because you signed up for Acme SaaS updates. <a href="#">Unsubscribe</a></p>
    </div>`,
    text_content: "Introducing AI Analytics. We're excited to announce our new AI-powered analytics dashboard. Launch offer: Get 30% off your first 3 months with code AI30LAUNCH. Expires March 31, 2026.",
    received_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    is_newsletter: true,
    newsletter_score: 0.92,
    classification_method: "header:list-unsubscribe, sender:known-platform, content:marketing-patterns",
    competitor_id: null,
    is_read: false,
    is_archived: false,
    is_starred: false,
    tags: ["product-launch", "discount"],
    headers_json: { "List-Unsubscribe": "<mailto:unsub@competitorA.com>" },
    is_demo: true,
  },
  {
    gmail_connection_id: null,
    gmail_message_id: "demo-002",
    from_email: "marketing@rivaltech.io",
    from_name: "RivalTech",
    subject: "Black Friday Extended: 50% Off All Plans — Ends Tonight!",
    html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111; color: #fff; padding: 32px;">
      <h1 style="color: #FFD700; text-align: center;">⚡ BLACK FRIDAY EXTENDED ⚡</h1>
      <p style="text-align: center; font-size: 24px;">50% OFF ALL PLANS</p>
      <p style="text-align: center; color: #FF4444; font-weight: bold;">⏰ ENDS TONIGHT AT MIDNIGHT ⏰</p>
      <p>Don't miss the biggest deal of the year. Upgrade to Pro or Enterprise and save big.</p>
      <ul>
        <li>Pro: $49/mo → <strong>$24.50/mo</strong></li>
        <li>Enterprise: $149/mo → <strong>$74.50/mo</strong></li>
      </ul>
      <p>Use code: <strong>BFRIDAY50</strong></p>
      <div style="text-align: center; margin: 24px 0;"><a href="#" style="padding: 16px 32px; background: #FFD700; color: #111; text-decoration: none; border-radius: 8px; font-weight: bold;">CLAIM 50% OFF NOW</a></div>
      <p style="font-size: 11px; color: #666; text-align: center;">Free shipping on all hardware add-ons. <a href="#" style="color: #888;">Unsubscribe</a></p>
    </div>`,
    text_content: "BLACK FRIDAY EXTENDED: 50% OFF ALL PLANS. Ends tonight at midnight. Pro: $49/mo → $24.50/mo. Enterprise: $149/mo → $74.50/mo. Use code: BFRIDAY50. Free shipping on all hardware add-ons.",
    received_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    is_newsletter: true,
    newsletter_score: 0.95,
    classification_method: "header:list-unsubscribe, content:unsubscribe-link, content:marketing-patterns",
    competitor_id: null,
    is_read: true,
    is_archived: false,
    is_starred: true,
    tags: ["promotion", "urgency", "pricing"],
    headers_json: { "List-Unsubscribe": "<mailto:unsub@rivaltech.io>", "Precedence": "bulk" },
    is_demo: true,
  },
  {
    gmail_connection_id: null,
    gmail_message_id: "demo-003",
    from_email: "digest@industryweekly.com",
    from_name: "Industry Weekly",
    subject: "Weekly Digest: AI Trends, Market Shifts & What's Next",
    html_content: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h1>Industry Weekly — March 25, 2026</h1>
      <h2>Top Stories</h2>
      <h3>1. AI Spending Surges 40% in Enterprise</h3>
      <p>Enterprise AI budgets have surged 40% year-over-year according to new Gartner data, with the largest growth in conversational AI and predictive analytics.</p>
      <h3>2. RivalTech Acquires DataFlow for $200M</h3>
      <p>In a move that reshapes the competitive landscape, RivalTech has acquired DataFlow, a leading data pipeline company, signaling their push into the data infrastructure space.</p>
      <h3>3. New Privacy Regulations Impact SaaS Pricing</h3>
      <p>The upcoming EU Digital Services Act amendments are forcing SaaS companies to rethink pricing models, with compliance costs rising 15-25% industry-wide.</p>
      <p style="margin-top: 24px;"><a href="#">Read full digest →</a></p>
      <p style="font-size: 11px; color: #999;">Sent weekly. <a href="#">Unsubscribe</a></p>
    </div>`,
    text_content: "Industry Weekly — March 25, 2026. Top Stories: 1. AI Spending Surges 40% in Enterprise. 2. RivalTech Acquires DataFlow for $200M. 3. New Privacy Regulations Impact SaaS Pricing.",
    received_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    is_newsletter: true,
    newsletter_score: 0.88,
    classification_method: "header:list-unsubscribe, header:precedence, content:unsubscribe-link",
    competitor_id: null,
    is_read: false,
    is_archived: false,
    is_starred: false,
    tags: ["industry-news", "competitive-intel"],
    headers_json: { "List-Unsubscribe": "<mailto:unsub@industryweekly.com>", "Precedence": "list" },
    is_demo: true,
  },
  {
    gmail_connection_id: null,
    gmail_message_id: "demo-004",
    from_email: "events@competitorB.co",
    from_name: "CompetitorB Events",
    subject: "You're Invited: Product Vision 2026 — Live Webinar April 10",
    html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h1>Product Vision 2026</h1>
      <p>Join our CEO and Head of Product for an exclusive look at what's coming in 2026.</p>
      <p><strong>Date:</strong> April 10, 2026 at 2:00 PM EST</p>
      <p><strong>Duration:</strong> 45 minutes + Q&A</p>
      <h3>What you'll learn:</h3>
      <ul>
        <li>Our new Enterprise API platform</li>
        <li>AI copilot for customer success</li>
        <li>Expanded integrations ecosystem</li>
        <li>New pricing tiers (including a free developer plan)</li>
      </ul>
      <p>🎁 <strong>Attendees get early access</strong> to our beta program + 20% off annual plans.</p>
      <a href="#" style="display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 6px;">Register Now — Limited Spots</a>
      <p style="margin-top: 24px; font-size: 11px; color: #999;"><a href="#">Unsubscribe</a></p>
    </div>`,
    text_content: "Product Vision 2026. Join our CEO and Head of Product for an exclusive look at what's coming. Date: April 10, 2026. Attendees get early access to our beta + 20% off annual plans.",
    received_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    is_newsletter: true,
    newsletter_score: 0.85,
    classification_method: "content:unsubscribe-link, content:marketing-patterns",
    competitor_id: null,
    is_read: false,
    is_archived: false,
    is_starred: false,
    tags: ["event", "product-launch"],
    headers_json: {},
    is_demo: true,
  },
  {
    gmail_connection_id: null,
    gmail_message_id: "demo-005",
    from_email: "team@startupnews.dev",
    from_name: "Startup Radar",
    subject: "🔍 Competitor Watch: 3 Moves You Should Know About",
    html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h1>Competitor Watch — Week 13</h1>
      <h2>🏢 Acme SaaS</h2>
      <p>Launched AI Analytics with aggressive 30% launch discount. Targeting mid-market with natural language query feature.</p>
      <h2>⚡ RivalTech</h2>
      <p>Extended Black Friday pricing into Q1. Acquired DataFlow ($200M) — clear signal they're building a data platform play.</p>
      <h2>🎯 CompetitorB</h2>
      <p>Announced free developer tier and Enterprise API. Webinar on April 10 to unveil 2026 product roadmap.</p>
      <p style="background: #FEF3C7; padding: 16px; border-radius: 8px; margin-top: 16px;"><strong>Strategy Note:</strong> All three competitors are investing heavily in AI features. If you're not shipping AI capabilities by Q2, you risk falling behind on positioning.</p>
      <p style="font-size: 11px; color: #999; margin-top: 24px;"><a href="#">Unsubscribe from Startup Radar</a></p>
    </div>`,
    text_content: "Competitor Watch — Week 13. Acme SaaS: Launched AI Analytics with 30% discount. RivalTech: Extended Black Friday, acquired DataFlow. CompetitorB: Free dev tier + Enterprise API. Strategy Note: All investing in AI.",
    received_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    is_newsletter: true,
    newsletter_score: 0.9,
    classification_method: "content:unsubscribe-link, header:list-unsubscribe",
    competitor_id: null,
    is_read: false,
    is_archived: false,
    is_starred: true,
    tags: ["competitive-intel", "strategy"],
    headers_json: { "List-Unsubscribe": "<https://startupnews.dev/unsub>" },
    is_demo: true,
  },
];
