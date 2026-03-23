import PublicHeader from "../_components/public/PublicHeader";
import PublicFooter from "../_components/public/PublicFooter";
import { getCurrentUser } from "../../lib/authServer";

export default async function TermsPage() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PublicHeader initialUser={user} />
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold text-white">Terms of Service</h1>
        <p className="mt-4 text-sm text-slate-300">Last updated: March 2026</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white">Acceptance of Terms</h2>
            <p>By accessing this platform, your organization agrees to these terms and applicable laws.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">User Responsibilities</h2>
            <p>You are responsible for account confidentiality and lawful usage of data and features.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">Service Availability</h2>
            <p>We aim for high availability but do not guarantee uninterrupted service at all times.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">Contact</h2>
            <p>For legal questions, contact: legal@hordingmap.com</p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
