import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

export async function POST(req) {
  try {
    const body = await req.json();
    const fullName = String(body?.fullName || "").trim();
    const email = String(body?.email || "").trim();
    const companyName = String(body?.companyName || "").trim() || null;
    const phone = String(body?.phone || "").trim() || null;
    const message = String(body?.message || "").trim();

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Full name, email and message are required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("contact_submissions").insert({
      full_name: fullName,
      email,
      company_name: companyName,
      phone,
      message,
      status: "new",
    });

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/contact-submissions Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit contact form" },
      { status: 500 }
    );
  }
}
