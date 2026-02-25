import type { APIRoute } from "astro";
import { Resend } from "resend";

// export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") || "";

    let name = "";
    let email = "";
    let phone = "";
    let message = "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      name = String(body.name || "").trim();
      email = String(body.email || "").trim();
      phone = String(body.phone || "").trim();
      message = String(body.message || "").trim();
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await request.formData();
      name = String(form.get("name") || "").trim();
      email = String(form.get("email") || "").trim();
      phone = String(form.get("phone") || "").trim();
      message = String(form.get("message") || "").trim();
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Unsupported Content-Type." }),
        { status: 415, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!name || !email || !phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const to = import.meta.env.CONTACT_TO_EMAIL;
    const from = import.meta.env.CONTACT_FROM_EMAIL;

    if (!to || !from || !import.meta.env.RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Server not configured." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeMessage = escapeHtml(message).replaceAll("\n", "<br/>");

    const result = await resend.emails.send({
      from: `RK Granito Contact <${from}>`,
      to,
      subject: `New contact form message from ${name}`,
      replyTo: email,
      html: `
        <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Phone:</strong> ${safePhone}</p>
          <p><strong>Message:</strong><br/>${safeMessage}</p>
          <hr/>
          <p style="color:#666; font-size:12px;">Sent from your website contact form.</p>
        </div>
      `,
    });

    if (result.error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error.message || "Unable to send email right now.",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Contact API error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Something went wrong." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
