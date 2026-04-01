import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <BarChart3 className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">Tracklyze</span>
          </Link>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
            <Link to="/"><ArrowLeft className="h-3 w-3" /> Back</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Information We Collect</h2>
            <p>When you use Tracklyze, we collect information you provide directly, such as your email address, name, and workspace details. If you connect external data sources (e.g., Gmail), we access only the data necessary to provide our service — specifically, read-only access to email content for competitor intelligence analysis.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
            <p>We use your information to provide, maintain, and improve the Tracklyze platform. This includes analyzing competitor communications, generating AI-powered insights, sending account notifications, and processing payments. We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. Data Sources & Access</h2>
            <p>When you connect Gmail, we request read-only access. We never send, delete, or modify any emails on your behalf. You can disconnect data sources at any time from your Settings page, which revokes our access immediately.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Data Security</h2>
            <p>All data is encrypted in transit (TLS) and at rest. Each workspace is fully isolated. OAuth tokens are stored securely server-side and are never exposed to the client application. We follow industry-standard security practices.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. Data Retention</h2>
            <p>We retain your data for as long as your account is active. If you delete your account or workspace, associated data will be permanently removed within 30 days. You can export your data at any time from the Settings page.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Third-Party Services</h2>
            <p>Tracklyze uses third-party services for authentication, payment processing (Stripe), and AI analysis. These services have their own privacy policies. We share only the minimum data necessary for each service to function.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. You can also disconnect data sources, export your data, or delete your account at any time. Contact us for any data-related requests.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Contact</h2>
            <p>For any privacy-related questions or concerns, please contact us at privacy@tracklyze.com.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
