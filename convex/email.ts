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

    const subject = "Shelf invite";
    const text = `You have been invited to Shelf.\n\nAccept: ${args.acceptUrl}\nDecline: ${args.denyUrl}`;
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.5;">
        <p>You have been invited to Shelf.</p>
        <p><a href="${args.acceptUrl}">Accept invite</a></p>
        <p><a href="${args.denyUrl}">Decline invite</a></p>
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
