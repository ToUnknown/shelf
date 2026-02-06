"use node";

import { actionGeneric } from "convex/server";
import { v } from "convex/values";
import nodemailer from "nodemailer";

const action = actionGeneric;

type EmailAction = {
  label: string;
  url: string;
  variant?: "primary" | "secondary";
};

const renderEmail = (args: {
  eyebrow: string;
  title: string;
  description: string;
  actions: EmailAction[];
  footnote: string;
  actionLayout?: "inline" | "invite";
  showFooter?: boolean;
  fullWidthActions?: boolean;
}) => {
  const renderAction = (
    action: EmailAction,
    options?: { fullWidth?: boolean; compact?: boolean },
  ) => {
    const isPrimary = (action.variant ?? "secondary") === "primary";
    const padding = options?.compact ? "10px 14px" : "12px 18px";
    const width = options?.fullWidth ? "100%" : "auto";
    const display = options?.fullWidth ? "block" : "inline-block";
    const className = isPrimary ? "btn btn-primary" : "btn btn-secondary";
    const label = isPrimary
      ? `<span style="color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;"><font color="#ffffff">${action.label}</font></span>`
      : action.label;
    return `
      <a
        href="${action.url}"
        class="${className}"
        style="
          display:${display};
          box-sizing:border-box;
          width:${width};
          text-align:center;
          margin:0;
          padding:${padding};
          border-radius:999px !important;
          font-size:14px;
          font-weight:700 !important;
          text-decoration:none !important;
          mso-line-height-rule:exactly;
          mso-line-height-rule:exactly;
        "
      >
        ${label}
      </a>
    `;
  };

  const actionHtml =
    args.actionLayout === "invite"
      ? `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;table-layout:fixed;">
          <tr>
            <td style="width:50%;padding-right:6px;vertical-align:top;">
              ${renderAction(args.actions[0], { fullWidth: true, compact: true })}
            </td>
            <td style="width:50%;padding-left:6px;vertical-align:top;">
              ${renderAction(args.actions[1], { fullWidth: true, compact: true })}
            </td>
          </tr>
        </table>
      `
      : args.actions
          .map(
            (action) =>
              `<span style="display:inline-block;margin-right:10px;margin-bottom:10px;width:${
                args.fullWidthActions ? "100%" : "auto"
              };">${renderAction(action, {
                fullWidth: Boolean(args.fullWidthActions),
              })}</span>`,
          )
          .join("");

  const actionWrapperStyle =
    args.actionLayout === "invite"
      ? "padding:18px 24px 18px 24px;"
      : "padding:18px 24px 8px 24px;";

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>
          body {
            margin: 0;
            padding: 0;
            background: transparent;
          }
          .email-card {
            max-width: 560px;
            margin: 0 auto;
            border-radius: 22px;
            overflow: hidden;
            border: 1px solid #e7d5c6;
            background: #fffaf6;
            box-shadow: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #3f210f;
          }
          .email-head {
            padding: 24px 24px 14px 24px;
            background:
              radial-gradient(340px 140px at 88% -8%, rgba(255,143,61,0.22), transparent 68%),
              #fff7f1;
            border-bottom: 1px solid #f3e0d0;
          }
          .email-eyebrow {
            margin: 0 0 10px 0;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.28em;
            text-transform: uppercase;
            color: #b45309;
          }
          .email-title {
            margin: 0 0 8px 0;
            font-size: 24px;
            line-height: 1.15;
            color: #2f1609;
          }
          .email-description {
            margin: 0;
            font-size: 15px;
            line-height: 1.5;
            color: #7a4a2e;
          }
          .email-foot {
            padding: 6px 24px 18px 24px;
            font-size: 12px;
            line-height: 1.45;
            color: #8f5a37;
            border-top: 1px solid #f3e0d0;
          }
          .btn {
            text-decoration: none !important;
            border-radius: 999px !important;
            font-weight: 700 !important;
          }
          .btn-primary {
            background: #ff8f3d !important;
            background-color: #ff8f3d !important;
            border: 1px solid #ff8f3d !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
          }
          .btn-secondary {
            background: rgba(255, 210, 178, 0.08);
            background-color: rgba(255, 210, 178, 0.08);
            border: 1px solid #e4bb98;
            color: #7a3e1a !important;
          }
          @media (prefers-color-scheme: dark) {
            .email-card {
              border: 1px solid rgba(255, 188, 135, 0.34) !important;
              background:
                radial-gradient(520px 230px at 95% -15%, rgba(255,143,61,0.26), transparent 64%),
                radial-gradient(380px 200px at -8% 105%, rgba(255,106,0,0.2), transparent 72%),
                #18100b !important;
              color: #fff3e8 !important;
            }
            .email-head {
              background:
                radial-gradient(340px 140px at 88% -8%, rgba(255,143,61,0.3), transparent 68%),
                linear-gradient(180deg, rgba(57,30,16,0.88), rgba(43,24,13,0.68)) !important;
              border-bottom: 1px solid rgba(255, 188, 135, 0.22) !important;
            }
            .email-eyebrow {
              color: #ffad6e !important;
            }
            .email-title {
              color: #fff3e8 !important;
            }
            .email-description {
              color: rgba(255, 210, 178, 0.9) !important;
            }
            .email-foot {
              color: rgba(255, 210, 178, 0.78) !important;
              border-top: 1px solid rgba(255, 188, 135, 0.2) !important;
            }
            .btn-secondary {
              background: rgba(255, 210, 178, 0.08) !important;
              background-color: rgba(255, 210, 178, 0.08) !important;
              border: 1px solid #f0c7a5 !important;
              color: #ffd8ba !important;
            }
          }
          [data-ogsc] .email-card {
            border: 1px solid rgba(255, 188, 135, 0.34) !important;
            background: #18100b !important;
            color: #fff3e8 !important;
          }
          [data-ogsc] .email-head {
            background: rgba(43,24,13,0.92) !important;
            border-bottom: 1px solid rgba(255, 188, 135, 0.22) !important;
          }
          [data-ogsc] .email-eyebrow {
            color: #ffad6e !important;
          }
          [data-ogsc] .email-title {
            color: #fff3e8 !important;
          }
          [data-ogsc] .email-description {
            color: rgba(255, 210, 178, 0.9) !important;
          }
          [data-ogsc] .email-foot {
            color: rgba(255, 210, 178, 0.78) !important;
            border-top: 1px solid rgba(255, 188, 135, 0.2) !important;
          }
          [data-ogsc] .btn-secondary {
            background: rgba(255, 210, 178, 0.08) !important;
            border: 1px solid #f0c7a5 !important;
            color: #ffd8ba !important;
          }
        </style>
      </head>
      <body>
        <div style="margin:0;padding:0 12px;box-sizing:border-box;background:transparent;">
          <div class="email-card">
            <div class="email-head">
              <p class="email-eyebrow">${args.eyebrow}</p>
              <h1 class="email-title">${args.title}</h1>
              <p class="email-description">${args.description}</p>
            </div>

            <div style="${actionWrapperStyle}">
              ${actionHtml}
            </div>
            ${
              args.showFooter === false
                ? ""
                : `<div class="email-foot">${args.footnote}</div>`
            }
          </div>
        </div>
      </body>
    </html>
  `;
};

const getMailerConfig = () => {
  const user = process.env.ICLOUD_USER;
  const pass = process.env.ICLOUD_APP_PASSWORD;
  const from = process.env.MAIL_FROM;

  if (!user || !pass || !from) {
    throw new Error("Missing email configuration env vars.");
  }

  return {
    from,
    transporter: nodemailer.createTransport({
      host: "smtp.mail.me.com",
      port: 587,
      secure: false,
      auth: { user, pass },
    }),
  };
};

export const sendInvite = action({
  args: {
    to: v.string(),
    acceptUrl: v.string(),
    denyUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const { transporter, from } = getMailerConfig();

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
    const html = renderEmail({
      eyebrow: "Shelf",
      title: "You're invited to Shelf",
      description:
        "Someone invited you to join their Shelf household. Accept to get started.",
      actionLayout: "invite",
      showFooter: false,
      actions: [
        { label: "Accept invite", url: args.acceptUrl, variant: "primary" },
        { label: "Decline", url: args.denyUrl },
      ],
      footnote: "If you didn't expect this, you can safely ignore this email.",
    });

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

export const sendAccountVerification = action({
  args: {
    to: v.string(),
    verifyUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const { transporter, from } = getMailerConfig();

    const subject = "Confirm your Shelf account";
    const text = [
      "Welcome to Shelf!",
      "",
      "Please confirm your email to unlock the app:",
      args.verifyUrl,
      "",
      "If you did not create this account, you can ignore this email.",
    ].join("\n");
    const html = renderEmail({
      eyebrow: "Shelf",
      title: "Confirm your email",
      description:
        "Your account was created successfully. Confirm your email to unlock Shelf.",
      fullWidthActions: true,
      showFooter: false,
      actions: [{ label: "Confirm email", url: args.verifyUrl, variant: "primary" }],
      footnote: "If you did not create this account, you can ignore this email.",
    });

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
