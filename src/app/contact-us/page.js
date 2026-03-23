import PublicHeader from "../_components/public/PublicHeader";
import PublicFooter from "../_components/public/PublicFooter";
import ContactForm from "./ContactForm";
import { getCurrentUser } from "../../lib/authServer";

export default async function ContactUsPage() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PublicHeader initialUser={user} />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h1 className="text-4xl font-semibold text-white">Contact Us</h1>
            <p className="mt-4 text-slate-300">
              Need enterprise onboarding, custom integrations, or pricing support?
              Share your details and our team will reach out.
            </p>
            <div className="mt-8 space-y-3 text-sm text-slate-300">
              <p><span className="font-semibold text-white">Email:</span> support@hordingmap.com</p>
              <p><span className="font-semibold text-white">Phone:</span> +91-00000-00000</p>
              <p><span className="font-semibold text-white">Office:</span> Mumbai, India</p>
            </div>
          </section>

          <ContactForm />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
