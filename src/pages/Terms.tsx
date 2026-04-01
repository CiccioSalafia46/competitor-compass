import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";

export default function Terms() {
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
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using Tracklyze, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform. These terms apply to all users, including workspace owners, team members, and visitors.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Description of Service</h2>
            <p>Tracklyze is a competitor intelligence platform that helps marketing and growth teams monitor competitor activity, analyze campaigns, and generate strategic insights. The platform provides automated data collection, AI-powered analysis, and alerting capabilities.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. Account Responsibilities</h2>
            <p>You are responsible for maintaining the security of your account credentials and for all activities under your account. You must provide accurate information during registration. Workspace owners are responsible for managing team member access and permissions.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Acceptable Use</h2>
            <p>You agree to use Tracklyze only for lawful purposes and in accordance with these terms. You may not use the platform to collect data you are not authorized to access, attempt to circumvent security measures, or interfere with the platform's operation.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. Subscriptions & Billing</h2>
            <p>Paid plans are billed monthly. You can upgrade, downgrade, or cancel at any time. Cancellations take effect at the end of the current billing period. Refunds are handled on a case-by-case basis. Plan limits (competitors, imports, analyses) are enforced based on your current subscription tier.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Data & Privacy</h2>
            <p>Your use of Tracklyze is also governed by our Privacy Policy. You retain ownership of your data. We process your data solely to provide the service. We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. AI-Generated Content</h2>
            <p>Tracklyze uses AI models to generate insights, analyses, and recommendations. These outputs are provided as-is and should be used as inputs to your decision-making, not as definitive conclusions. Confidence scores indicate reliability, but accuracy is not guaranteed.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Limitation of Liability</h2>
            <p>Tracklyze is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability is limited to the amount you paid in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">9. Changes to Terms</h2>
            <p>We may update these terms from time to time. We will notify you of material changes via email or in-app notification. Continued use after changes constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">10. Contact</h2>
            <p>For questions about these terms, contact us at legal@tracklyze.com.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
