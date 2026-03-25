import Link from "next/link";
import PublicHeader from "./_components/public/PublicHeader";
import PublicFooter from "./_components/public/PublicFooter";
import ThreeHeroBanner from "./_components/public/ThreeHeroBanner";
import { getCurrentUser } from "../lib/authServer";

export default async function Page() {
  const user = await getCurrentUser();
  const logos = [
    "GlobalReach Media",
    "AdSphere Agency",
    "UrbanScreens",
    "MetroBrand Co.",
    "ScaleBridge",
    "Prime OOH Network",
  ];
  const testimonials = [
    {
      quote:
        "Hording Map helped our agency reduce media planning time by nearly 40% across multi-city campaigns.",
      name: "Raghav Sharma",
      role: "Media Director, AdSphere Agency",
    },
    {
      quote:
        "The variant-level control and ownership model gave our enterprise team exactly the governance we needed.",
      name: "Priya Menon",
      role: "Head of Marketing Ops, MetroBrand Co.",
    },
    {
      quote:
        "From discovery to activation, this is the cleanest workflow we have used for OOH inventory planning.",
      name: "Arjun Khanna",
      role: "Campaign Lead, GlobalReach Media",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PublicHeader initialUser={user} />

      <main>
        <section className="relative isolate min-h-[92vh] overflow-hidden border-b border-slate-800">
          <div className="absolute inset-0 -z-20">
            <ThreeHeroBanner />
          </div>
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(56,189,248,0.22),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(37,99,235,0.18),transparent_45%),linear-gradient(to_bottom,rgba(2,6,23,0.45),rgba(2,6,23,0.9))]" />
          <div className="glow-spot left-[-120px] top-[80px] h-72 w-72 bg-cyan-400/40" />
          <div className="glow-spot bottom-[-80px] right-[-60px] h-80 w-80 bg-blue-500/40" />

          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
            <div>
              <p className="fade-up mb-3 inline-flex rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-cyan-200">
                B2B OOH Intelligence Platform
              </p>
              <h1 className="fade-up fade-up-delay-1 text-4xl font-medium leading-tight text-white sm:text-6xl">
                Premium outdoor media planning, with speed and control.
              </h1>
              <p className="fade-up fade-up-delay-2 mt-5 max-w-xl text-slate-200">
                Hording Map unifies inventory discovery, city-level intelligence,
                variant pricing, and activation workflows for agencies and enterprise
                brands.
              </p>
              <div className="fade-up fade-up-delay-3 mt-7 flex flex-wrap gap-3">
                <Link href="/explore" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:scale-[1.02] hover:bg-blue-500">
                  Explore Inventory
                </Link>
                <Link href="/contact-us" className="rounded-lg border border-slate-600 bg-slate-900/30 px-5 py-2.5 text-sm font-medium text-slate-100 transition hover:scale-[1.02] hover:border-slate-400">
                  Book a Demo
                </Link>
              </div>
              <div className="fade-up fade-up-delay-3 mt-8 grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg border border-white/15 bg-slate-900/35 p-3 backdrop-blur">
                  <p className="text-xl font-bold text-white">7,500+</p>
                  <p className="text-xs text-slate-300">Media Assets</p>
                </div>
                <div className="rounded-lg border border-white/15 bg-slate-900/35 p-3 backdrop-blur">
                  <p className="text-xl font-bold text-white">120+</p>
                  <p className="text-xs text-slate-300">Cities Covered</p>
                </div>
                <div className="rounded-lg border border-white/15 bg-slate-900/35 p-3 backdrop-blur">
                  <p className="text-xl font-bold text-white">40%</p>
                  <p className="text-xs text-slate-300">Faster Planning Cycle</p>
                </div>
              </div>
            </div>

            <div className="float-card hidden rounded-2xl border border-white/15 bg-slate-900/30 p-5 shadow-2xl shadow-cyan-900/20 backdrop-blur lg:block">
              <p className="text-xs uppercase tracking-wide text-cyan-300">Live Platform Snapshot</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-md border border-slate-700/80 bg-slate-950/70 p-3">
                  <p className="text-xs text-slate-400">Avg. campaign planning time</p>
                  <p className="text-lg font-medium text-white">From 5 days to 3 days</p>
                </div>
                <div className="rounded-md border border-slate-700/80 bg-slate-950/70 p-3">
                  <p className="text-xs text-slate-400">Inventory coverage</p>
                  <p className="text-lg font-medium text-white">OOH + DOOH + Transit</p>
                </div>
                <div className="rounded-md border border-slate-700/80 bg-slate-950/70 p-3">
                  <p className="text-xs text-slate-400">Access model</p>
                  <p className="text-lg font-medium text-white">Strict account ownership</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-800 bg-slate-900/30">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <p className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-slate-400">
              Trusted by growth-focused teams
            </p>
            <div className="marquee">
              <div className="marquee-track gap-3 text-center text-sm font-normal text-slate-300">
                {[...logos, ...logos].map((logo, i) => (
                  <div key={`${logo}-${i}`} className="min-w-[190px] rounded-md border border-slate-800 bg-slate-900 px-4 py-2">
                    {logo}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative border-b border-slate-800 bg-slate-900/20">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-300">Platform Capabilities</p>
                <h2 className="text-4xl font-medium text-white sm:text-5xl">Built for serious campaign velocity</h2>
              </div>
              <p className="max-w-md text-sm text-slate-300">
                Design-first interface, enterprise controls, and data-rich planning in one workflow.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <article className="group rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-500/60">
                <p className="mb-4 text-xs uppercase tracking-wide text-cyan-300">01</p>
                <h3 className="mb-2 text-xl font-semibold text-white">Inventory Intelligence</h3>
                <p className="text-sm text-slate-300">Map discovery with structured attributes, standardized metadata, and clean variant relationships.</p>
                <div className="mt-5 h-1.5 w-20 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
              </article>
              <article className="group rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-500/60">
                <p className="mb-4 text-xs uppercase tracking-wide text-cyan-300">02</p>
                <h3 className="mb-2 text-xl font-semibold text-white">Workflow Governance</h3>
                <p className="text-sm text-slate-300">Ownership-driven access with clean controls so teams collaborate without data leakage.</p>
                <div className="mt-5 h-1.5 w-20 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
              </article>
              <article className="group rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-500/60">
                <p className="mb-4 text-xs uppercase tracking-wide text-cyan-300">03</p>
                <h3 className="mb-2 text-xl font-semibold text-white">Activation Speed</h3>
                <p className="text-sm text-slate-300">Bulk import/export, quick rate updates, and fewer handoffs from planning to execution.</p>
                <div className="mt-5 h-1.5 w-20 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
              </article>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid items-stretch gap-6 lg:grid-cols-12">
            <article className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-7 lg:col-span-5">
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-500/20 blur-3xl" />
              <p className="text-xs uppercase tracking-[0.2em] text-blue-300">For agencies</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">Multi-brand planning at scale</h3>
              <p className="mt-3 text-sm text-slate-300">Create faster city comparisons, align media mixes, and reduce planning noise across accounts.</p>
            </article>
            <article className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-7 lg:col-span-4">
              <div className="absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-cyan-500/20 blur-3xl" />
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">For brands</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">Operational clarity</h3>
              <p className="mt-3 text-sm text-slate-300">Standardize buying workflows and get visibility from regional planning to enterprise reporting.</p>
            </article>
            <article className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-7 lg:col-span-3">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">For owners</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">Inventory value unlock</h3>
              <p className="mt-3 text-sm text-slate-300">Digitize and package inventory with stronger discoverability for qualified demand.</p>
            </article>
          </div>
        </section>

        <section className="border-y border-slate-800 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.45),rgba(2,6,23,0.75))]">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="text-4xl font-semibold text-white">What teams say</h2>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Client stories</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((item) => (
                <article key={item.name} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-900/20">
                  <p className="text-base leading-relaxed text-slate-200">"{item.quote}"</p>
                  <div className="mt-6 border-t border-slate-800 pt-4">
                    <p className="text-sm font-semibold text-cyan-300">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-4xl font-semibold text-white">Frequently asked questions</h2>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Everything you need to know</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 transition duration-300 hover:border-slate-600 hover:bg-slate-900">
              <h3 className="font-semibold text-white">Can we onboard city-wise inventory in bulk?</h3>
              <p className="mt-2 text-sm text-slate-300">Yes. CSV import supports large batch onboarding, with normalized fields and variant rows.</p>
            </article>
            <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 transition duration-300 hover:border-slate-600 hover:bg-slate-900">
              <h3 className="font-semibold text-white">Do you support enterprise access controls?</h3>
              <p className="mt-2 text-sm text-slate-300">Yes. Ownership-based access is implemented so each account sees only authorized data.</p>
            </article>
            <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 transition duration-300 hover:border-slate-600 hover:bg-slate-900">
              <h3 className="font-semibold text-white">Is this useful for agency and brand teams together?</h3>
              <p className="mt-2 text-sm text-slate-300">Absolutely. The workflow is designed for cross-functional planning and activation teams.</p>
            </article>
            <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 transition duration-300 hover:border-slate-600 hover:bg-slate-900">
              <h3 className="font-semibold text-white">Can we request a custom implementation?</h3>
              <p className="mt-2 text-sm text-slate-300">Yes. Use the contact page for custom integrations and enterprise onboarding.</p>
            </article>
          </div>
        </section>

        <section className="border-t border-slate-800 bg-gradient-to-r from-blue-950/40 via-slate-900 to-cyan-950/40">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold text-white">Ready to upgrade your OOH planning stack?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300">
              Let us help your team launch faster workflows and better campaign outcomes.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/contact-us" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">
                Book a Strategy Call
              </Link>
              <Link href="/about-us" className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-500">
                Learn About Us
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}