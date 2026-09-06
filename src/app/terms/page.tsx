import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Study OS",
  description: "Terms of Service for Study OS",
};

export default function TermsOfService() {
  return (
    <main className="min-h-dvh max-w-3xl mx-auto px-6 py-12 text-neutral-300">
      <div className="mb-8">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
          &larr; Back to home
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-neutral-100 mb-6">Terms of Service</h1>
      <div className="space-y-6 text-sm leading-relaxed">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <section>
          <h2 className="text-xl font-semibold text-neutral-200 mb-3">1. Acceptance of Terms</h2>
          <p>By accessing and using Study OS, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-200 mb-3">2. Description of Service</h2>
          <p>Study OS is a study management and scheduling tool. We provide features to track study sessions and sync them with external calendars like Google Calendar.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-200 mb-3">3. User Accounts</h2>
          <p>You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-200 mb-3">4. Termination</h2>
          <p>We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
        </section>
      </div>
    </main>
  );
}
