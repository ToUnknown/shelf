"use node";

import { actionGeneric } from "convex/server";
import { v } from "convex/values";
import nodemailer from "nodemailer";

const action = actionGeneric;

export const sendInvite = action({
  args: {
    to: v.string(),
    acceptUrl: v.string(),
    denyUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const user = process.env.ICLOUD_USER;
    const pass = process.env.ICLOUD_APP_PASSWORD;
    const from = process.env.MAIL_FROM;

    if (!user || !pass || !from) {
      throw new Error("Missing email configuration env vars.");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.mail.me.com",
      port: 587,
      secure: false,
      auth: { user, pass },
    });

    const subject = "You're invited to Shelf";
    const text = [
      "You're invited to Shelf.",
      "",
      "Accept invite:",
      args.acceptUrl,
      "",
      "Decline invite:",
      args.denyUrl,
      "",
      "If you didn't expect this, you can ignore this email.",
    ].join("\n");
    const html = `
      <div style="padding:32px 16px;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;color:#0f172a;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;box-shadow:0 12px 32px rgba(15,23,42,0.08);overflow:hidden;">
          <div style="padding:28px 28px 8px 28px;">
            <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.35em;text-transform:uppercase;color:#94a3b8;">Shelf</p>
            <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.2;color:#0f172a;">You're invited</h1>
            <p style="margin:0 0 16px 0;font-size:15px;color:#475569;">
              Someone invited you to join their Shelf household. Accept to get started.
            </p>
          </div>
          <div style="padding:0 28px 24px 28px;">
            <a href="${args.acceptUrl}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#0f172a;color:#ffffff;font-weight:600;text-decoration:none;font-size:14px;">
              Accept invite
            </a>
            <span style="display:inline-block;width:12px;"></span>
            <a href="${args.denyUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;border:1px solid #e2e8f0;color:#475569;text-decoration:none;font-size:14px;">
              Decline
            </a>
          </div>
          <div style="padding:0 28px 24px 28px;font-size:12px;color:#94a3b8;">
            If you didn't expect this, you can safely ignore this email.
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from,
      to: args.to,
      subject,
      text,
      html,
      replyTo: from,
    });
  },
});
