import PublicHeader from "../_components/public/PublicHeader";
import PublicFooter from "../_components/public/PublicFooter";
import { getCurrentUser } from "../../lib/authServer";

export default async function PrivacyPolicyPage() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PublicHeader initialUser={user} />
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold text-white">Privacy Policy</h1>
        <p className="mt-4 text-sm text-slate-300">
          Last updated: March 2026
        </p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white">Information We Collect</h2>
            <p>We collect account, contact, and usage data necessary to deliver medvar services.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">How We Use Data</h2>
            <p>We use your data to operate the platform, improve product quality, and support customer requests.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">Data Sharing</h2>
            <p>We do not sell personal data. Data may be shared with authorized service providers required for platform operations.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">Contact</h2>
            <p>For privacy requests, contact: privacy@medvar.com</p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
