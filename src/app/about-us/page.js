import PublicHeader from "../_components/public/PublicHeader";
import PublicFooter from "../_components/public/PublicFooter";
import { getCurrentUser } from "../../lib/authServer";

export const metadata = {
  title: "About Us | Hording Map",
  description: "Learn about Hording Map, a B2B outdoor media planning platform.",
};

export default async function AboutUsPage() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PublicHeader initialUser={user} />
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold text-white">About Us</h1>
        <p className="mt-4 text-slate-300">
          Hording Map is a B2B media technology company helping agencies and brands
          plan and execute outdoor campaigns with speed, transparency and control.
        </p>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold text-white">Our Mission</h2>
            <p className="mt-2 text-sm text-slate-300">
              Make outdoor media buying as data-driven and operationally simple as
              digital advertising.
            </p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold text-white">Our Focus</h2>
            <p className="mt-2 text-sm text-slate-300">
              Inventory intelligence, variant-level management, and enterprise-grade
              workflows for marketing teams.
            </p>
          </article>
        </section>

        <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold text-white">Who We Serve</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
            <li>Media agencies planning multi-city campaigns</li>
            <li>Enterprise marketing teams managing large media spends</li>
            <li>Owners/operators digitizing media inventory operations</li>
          </ul>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
