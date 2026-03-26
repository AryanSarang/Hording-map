import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-slate-400 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <h3 className="mb-2 text-base font-semibold text-white">medvar</h3>
          <p>
            AI-powered media planning platform for brands and agencies to discover
            better locations, optimize spend, and launch campaigns with confidence.
          </p>
        </div>
        <div>
          <h4 className="mb-2 font-semibold text-white">Company</h4>
          <div className="flex flex-col gap-1">
            <Link href="/about-us" className="hover:text-white">About Us</Link>
            <Link href="/contact-us" className="hover:text-white">Contact Us</Link>
            <Link href="/explore" className="hover:text-white">Explore Locations</Link>
          </div>
        </div>
        <div>
          <h4 className="mb-2 font-semibold text-white">Legal</h4>
          <div className="flex flex-col gap-1">
            <Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-white">Terms of Service</Link>
            <Link href="/cookie-policy" className="hover:text-white">Cookie Policy</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} medvar. All rights reserved.
      </div>
    </footer>
  );
}
