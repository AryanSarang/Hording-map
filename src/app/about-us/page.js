import PublicHeader from "../_components/public/PublicHeader";
import PublicFooter from "../_components/public/PublicFooter";
import { getCurrentUser } from "../../lib/authServer";

export const metadata = {
  title: "About Us | medvar",
  description: "Learn about medvar, the AI-powered media planning platform.",
};

export default async function AboutUsPage() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PublicHeader initialUser={user} />
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold text-white">About Us</h1>
        <p className="mt-4 text-slate-300">
          medvar is an AI-powered media planning platform that helps brands and
          agencies choose better locations, optimize budgets, and launch campaigns
          with confidence.
        </p>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold text-white">Our Mission</h2>
            <p className="mt-2 text-sm text-slate-300">
              Make location-based advertising as measurable and intelligent as
              performance marketing.
            </p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold text-white">Our Vision</h2>
            <p className="mt-2 text-sm text-slate-300">
              Become the default planning engine for modern real-world media
              campaigns globally.
            </p>
          </article>
        </section>

        <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold text-white">What Makes medvar Different</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
            <li>AI-based campaign planning from a simple prompt.</li>
            <li>Location-intelligence recommendations for better placement decisions.</li>
            <li>Transparent budget allocation logic your team can trust.</li>
            <li>Faster planning cycles with collaboration-ready workflows.</li>
          </ul>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
