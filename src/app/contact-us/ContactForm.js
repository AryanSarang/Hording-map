"use client";

import { useState } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    companyName: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/contact-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to send message");
      setResult({ ok: true, text: "Thanks! Our team will contact you shortly." });
      setForm({ fullName: "", email: "", companyName: "", phone: "", message: "" });
    } catch (err) {
      setResult({ ok: false, text: err.message || "Failed to submit" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Full Name *</label>
          <input required name="fullName" value={form.fullName} onChange={onChange} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Work Email *</label>
          <input required type="email" name="email" value={form.email} onChange={onChange} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Company Name</label>
          <input name="companyName" value={form.companyName} onChange={onChange} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Phone Number</label>
          <input name="phone" value={form.phone} onChange={onChange} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Message *</label>
          <textarea required rows={5} name="message" value={form.message} onChange={onChange} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
        </div>
        {result && (
          <div className={`rounded-md border px-3 py-2 text-sm ${result.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
            {result.text}
          </div>
        )}
        <button disabled={submitting} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
          {submitting ? "Sending..." : "Send Message"}
        </button>
      </form>
    </section>
  );
}
