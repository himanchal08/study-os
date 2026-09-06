import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Study OS",
  description: "Privacy Policy for Study OS",
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-dvh max-w-3xl mx-auto px-6 py-12 text-neutral-300">
      <div className="mb-8">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
          &larr; Back to home
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-neutral-100 mb-6">Privacy Policy</h1>
      <div className="space-y-6 text-sm leading-relaxed">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <section>
          <h2 className="text-xl font-semibold text-neutral-200 mb-3">1. Information We Collect</h2>
          <p>We collect information you provide directly to us when you create an account, such as your name and email address. If you connect your Google Calendar, we request access to manage your calendar events to provide the core syncing functionality of our service.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-200 mb-3">2. How We Use Your Information</h2>
          <p>We use the information we collect to provide, maintain, and improve our services. Specifically, your Google Calendar access is used strictly to sync your study sessions and exam schedules to your calendar.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-200 mb-3">3. Data Storage and Security</h2>
          <p>Your data is stored securely using industry-standard encryption. We do not sell or share your personal information or calendar data with third parties.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-200 mb-3">4. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at our support email.</p>
        </section>
      </div>
    </main>
  );
}
