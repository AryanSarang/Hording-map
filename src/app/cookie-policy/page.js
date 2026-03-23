import PublicHeader from "../_components/public/PublicHeader";
import PublicFooter from "../_components/public/PublicFooter";
import { getCurrentUser } from "../../lib/authServer";

export default async function CookiePolicyPage() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PublicHeader initialUser={user} />
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold text-white">Cookie Policy</h1>
        <p className="mt-4 text-sm text-slate-300">Last updated: March 2026</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white">What Are Cookies</h2>
            <p>Cookies are small files placed on your browser to remember settings and improve experience.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">How We Use Cookies</h2>
            <p>We use essential and analytics cookies to support authentication, performance and reliability.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">Managing Cookies</h2>
            <p>You can disable cookies in browser settings, but some platform features may not function correctly.</p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
