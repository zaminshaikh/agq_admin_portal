/**
 * @file sendInviteEmail.ts
 * @description Firebase callable function to send invite emails to clients using Resend API.
 *
 * The HTML template is intentionally written using the "bulletproof email" pattern
 * (table-based layout, inline CSS, web-safe fonts, no SVG, no flexbox, no CSS
 * gradients) so that the message renders consistently across all major mail
 * clients, including Outlook for Windows / Outlook for Mac, which use the Word
 * rendering engine and historically do not support modern HTML/CSS features.
 *
 * The AGQ logo is delivered as an inline (CID) attachment instead of inline SVG
 * because Outlook strips inline SVG and many other clients render it
 * inconsistently.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Resend } from "resend";
import { AGQ_LOGO_BASE64 } from "../assets/agqLogoBase64";

// Define the secret for Resend API key
const resendApiKey = defineSecret("RESEND_API_KEY");

interface SendInviteEmailRequest {
  clientName: string;
  clientEmail: string;
  clientCid: string;
}

interface SendInviteEmailResponse {
  success: boolean;
  message: string;
  emailId?: string;
}

const LOGO_CID = "agq-logo";
const IOS_LINK = "https://apps.apple.com/us/app/agq/id6502013306";
const ANDROID_LINK =
  "https://play.google.com/store/apps/details?id=com.teamshaikh.investmentportfolio";
const SUPPORT_EMAIL = "management@agqconsulting.com";

const PRIMARY_COLOR = "#0a3464";
const TEXT_COLOR = "#3e3e3e";
const MUTED_TEXT = "#5a5a5a";
const SOFT_BG = "#f5f5f5";
const PANEL_BG = "#f8f9fa";
const BORDER_COLOR = "#e2e6ea";

const FONT_STACK =
  "Arial, Helvetica, 'Segoe UI', Roboto, sans-serif";

/**
 * Escape any user-controlled string before injecting into HTML so that
 * names/CIDs containing characters such as `<`, `>`, `&`, `"`, `'` cannot
 * break the rendered template or introduce unintended markup.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Creates a plain-text fallback for the email. Some clients (and many spam
 * filters) prefer messages that include both an HTML and a plain-text part.
 */
function createPlainTextEmail(firstName: string, clientCid: string): string {
  return [
    `Dear ${firstName},`,
    "",
    "Welcome to your Investment Management App Invitation.",
    "",
    "AGQ is pleased to invite you to access your investment portfolio through",
    "our secure mobile application. With this app, you can conveniently monitor",
    "your up-to-date investment information, track performance, and stay",
    "connected with your financial growth - all from your mobile device.",
    "",
    "Getting Started - Three Simple Steps:",
    "",
    "1. Download the Application",
    `   For iOS Users:     ${IOS_LINK}`,
    `   For Android Users: ${ANDROID_LINK}`,
    "",
    "   Important: The application is exclusively available on mobile devices.",
    "   Please open the download links directly on your smartphone or tablet.",
    "",
    "2. Enter Your Client Identification Number",
    `   Your Client ID (CID): ${clientCid}`,
    "",
    "3. Complete Account Setup",
    "   Follow the guided instructions to create your secure account using",
    "   your email address and Client ID. This is a one-time setup process -",
    "   your CID will not be required for future logins.",
    "",
    `Contact Support: ${SUPPORT_EMAIL}`,
    "",
    "Thank you for your continued trust in AGQ.",
    "",
    "With humility and continued gratitude,",
    "Sonny and Kash Shaikh",
    "AGQ Team",
    "",
    "Planning Today, Securing Tomorrow",
    "AGQ Consulting LLC",
    "195 International Parkway, Suite 103, Lake Mary, FL 32746",
    `Email: ${SUPPORT_EMAIL}`,
  ].join("\n");
}

/**
 * Creates the HTML email body. The layout is built with nested tables and
 * inline styles only, which is the safest cross-client approach (including
 * Outlook on Windows, which uses the Word rendering engine).
 */
function createEmailTemplate(clientName: string, clientCid: string): string {
  const firstName = escapeHtml(clientName.split(" ")[0] || clientName);
  const safeCid = escapeHtml(clientCid);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>Welcome to your Investment Management App Invitation</title>
  <!--[if mso]>
  <style type="text/css">
    table, td, div, h1, p { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${SOFT_BG}; }
    a { color: ${PRIMARY_COLOR}; text-decoration: underline; }
    @media screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .responsive-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${SOFT_BG}; font-family:${FONT_STACK}; color:${TEXT_COLOR};">
  <!-- Preheader: shown in inbox preview, hidden in body -->
  <div style="display:none; font-size:1px; color:${SOFT_BG}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
    Your AGQ Investment Management App invitation and Client ID are inside.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${SOFT_BG};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#ffffff; border:1px solid ${BORDER_COLOR};">
          <!-- Header -->
          <tr>
            <td align="center" bgcolor="${PRIMARY_COLOR}" style="background-color:${PRIMARY_COLOR}; padding:32px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <img src="cid:${LOGO_CID}" alt="AGQ" width="160" height="101" style="display:block; width:160px; height:auto; max-width:160px; border:0; outline:none; text-decoration:none;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:Georgia, 'Times New Roman', Times, serif; color:#ffffff; font-size:26px; line-height:32px; font-weight:normal; mso-line-height-rule:exactly;">
                    Welcome to your Investment<br />Management App Invitation
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting + intro -->
          <tr>
            <td class="responsive-padding" style="padding:32px 32px 8px 32px; font-family:${FONT_STACK}; color:${TEXT_COLOR};">
              <p style="margin:0 0 16px 0; font-size:18px; line-height:26px; font-weight:bold; color:${TEXT_COLOR};">
                Dear ${firstName},
              </p>
              <p style="margin:0 0 16px 0; font-size:16px; line-height:24px; color:${TEXT_COLOR};">
                We hope this message finds you well. AGQ is pleased to invite you to access your investment portfolio through our secure mobile application.
              </p>
              <p style="margin:0 0 8px 0; font-size:16px; line-height:24px; color:${TEXT_COLOR};">
                With this app, you can conveniently monitor your up-to-date investment information, track performance, and stay connected with your financial growth&mdash;all from your mobile device.
              </p>
            </td>
          </tr>

          <!-- Steps -->
          <tr>
            <td class="responsive-padding" style="padding:16px 32px 8px 32px; font-family:${FONT_STACK};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PANEL_BG}; border-left:4px solid ${PRIMARY_COLOR};">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 20px 0; font-family:Georgia, 'Times New Roman', Times, serif; font-size:20px; line-height:26px; color:${TEXT_COLOR};">
                      Getting Started &mdash; Three Simple Steps
                    </p>

                    <!-- Step 1 -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border:1px solid ${BORDER_COLOR}; margin:0 0 16px 0;">
                      <tr>
                        <td style="padding:20px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="32" valign="middle" style="padding-right:12px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td align="center" valign="middle" width="28" height="28" bgcolor="${PRIMARY_COLOR}" style="background-color:${PRIMARY_COLOR}; color:#ffffff; font-family:${FONT_STACK}; font-size:14px; font-weight:bold; line-height:28px; mso-line-height-rule:exactly; width:28px; height:28px;">
                                      1
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td valign="middle" style="font-family:Georgia, 'Times New Roman', Times, serif; font-size:18px; line-height:24px; color:${TEXT_COLOR};">
                                Download the Application
                              </td>
                            </tr>
                          </table>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
                            <tr>
                              <td style="font-family:${FONT_STACK}; font-size:15px; line-height:22px; color:${TEXT_COLOR};">
                                <strong style="color:${TEXT_COLOR};">For iOS Users:</strong><br />
                                <a href="${IOS_LINK}" style="color:${PRIMARY_COLOR}; text-decoration:underline; word-break:break-all;">${IOS_LINK}</a>
                              </td>
                            </tr>
                            <tr>
                              <td style="font-family:${FONT_STACK}; font-size:15px; line-height:22px; color:${TEXT_COLOR}; padding-top:10px;">
                                <strong style="color:${TEXT_COLOR};">For Android Users:</strong><br />
                                <a href="${ANDROID_LINK}" style="color:${PRIMARY_COLOR}; text-decoration:underline; word-break:break-all;">${ANDROID_LINK}</a>
                              </td>
                            </tr>
                          </table>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px; background-color:#fff8e1; border-left:4px solid #d4a017;">
                            <tr>
                              <td style="padding:12px 14px; font-family:${FONT_STACK}; font-size:14px; line-height:20px; color:${TEXT_COLOR};">
                                <strong style="color:${PRIMARY_COLOR};">Important:</strong> The application is exclusively available on mobile devices. Please open the download links directly on your smartphone or tablet.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Step 2 -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border:1px solid ${BORDER_COLOR}; margin:0 0 16px 0;">
                      <tr>
                        <td style="padding:20px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="32" valign="middle" style="padding-right:12px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td align="center" valign="middle" width="28" height="28" bgcolor="${PRIMARY_COLOR}" style="background-color:${PRIMARY_COLOR}; color:#ffffff; font-family:${FONT_STACK}; font-size:14px; font-weight:bold; line-height:28px; mso-line-height-rule:exactly; width:28px; height:28px;">
                                      2
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td valign="middle" style="font-family:Georgia, 'Times New Roman', Times, serif; font-size:18px; line-height:24px; color:${TEXT_COLOR};">
                                Enter Your Client Identification Number
                              </td>
                            </tr>
                          </table>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px; background-color:#eef2f8; border:2px solid ${PRIMARY_COLOR};">
                            <tr>
                              <td align="center" style="padding:18px;">
                                <p style="margin:0 0 6px 0; font-family:${FONT_STACK}; font-size:12px; line-height:16px; letter-spacing:1px; text-transform:uppercase; color:${PRIMARY_COLOR}; font-weight:bold;">
                                  Your Client ID (CID)
                                </p>
                                <p style="margin:0; font-family:'Courier New', Courier, monospace; font-size:24px; line-height:30px; color:${TEXT_COLOR}; font-weight:bold; letter-spacing:2px;">
                                  ${safeCid}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Step 3 -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border:1px solid ${BORDER_COLOR};">
                      <tr>
                        <td style="padding:20px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="32" valign="middle" style="padding-right:12px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td align="center" valign="middle" width="28" height="28" bgcolor="${PRIMARY_COLOR}" style="background-color:${PRIMARY_COLOR}; color:#ffffff; font-family:${FONT_STACK}; font-size:14px; font-weight:bold; line-height:28px; mso-line-height-rule:exactly; width:28px; height:28px;">
                                      3
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td valign="middle" style="font-family:Georgia, 'Times New Roman', Times, serif; font-size:18px; line-height:24px; color:${TEXT_COLOR};">
                                Complete Account Setup
                              </td>
                            </tr>
                          </table>
                          <p style="margin:12px 0 0 0; font-family:${FONT_STACK}; font-size:15px; line-height:22px; color:${TEXT_COLOR};">
                            Follow the guided instructions to create your secure account using your email address and Client ID. This is a one-time setup process&mdash;your CID will not be required for future logins.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Support -->
          <tr>
            <td class="responsive-padding" style="padding:24px 32px 8px 32px; font-family:${FONT_STACK};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PANEL_BG}; border:1px solid ${BORDER_COLOR};">
                <tr>
                  <td align="center" style="padding:20px;">
                    <p style="margin:0 0 8px 0; font-size:15px; line-height:22px; color:${TEXT_COLOR};">
                      Our platform is designed with simplicity and security in mind. Should you require any assistance during the setup process or have questions about your account, our dedicated support team is readily available.
                    </p>
                    <p style="margin:8px 0 0 0; font-size:15px; line-height:22px; color:${TEXT_COLOR};">
                      <strong style="color:${TEXT_COLOR};">Contact Support:</strong>
                      <a href="mailto:${SUPPORT_EMAIL}" style="color:${PRIMARY_COLOR}; font-weight:bold; text-decoration:underline;">${SUPPORT_EMAIL}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Closing copy -->
          <tr>
            <td class="responsive-padding" style="padding:16px 32px 8px 32px; font-family:${FONT_STACK};">
              <p style="margin:0; font-size:16px; line-height:24px; color:${TEXT_COLOR};">
                Thank you for your continued trust in AGQ. We are excited to provide you with enhanced accessibility and a more streamlined experience through this mobile platform.
              </p>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td class="responsive-padding" style="padding:16px 32px 32px 32px; font-family:${FONT_STACK};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PANEL_BG}; border:1px solid ${BORDER_COLOR};">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 6px 0; font-family:${FONT_STACK}; font-size:15px; line-height:22px; font-style:italic; color:${TEXT_COLOR};">
                      With humility and continued gratitude,
                    </p>
                    <p style="margin:0 0 4px 0; font-family:Georgia, 'Times New Roman', Times, serif; font-size:18px; line-height:24px; color:${TEXT_COLOR}; font-weight:bold;">
                      Sonny and Kash Shaikh
                    </p>
                    <p style="margin:0; font-family:${FONT_STACK}; font-size:13px; line-height:18px; color:${MUTED_TEXT};">
                      AGQ Team
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" bgcolor="${PRIMARY_COLOR}" style="background-color:${PRIMARY_COLOR}; padding:28px 24px; font-family:${FONT_STACK};">
              <p style="margin:0 0 14px 0; font-family:Georgia, 'Times New Roman', Times, serif; font-size:15px; line-height:22px; font-style:italic; color:#ffffff;">
                &ldquo;Planning Today, Securing Tomorrow&rdquo;
              </p>
              <p style="margin:0 0 6px 0; font-size:14px; line-height:20px; color:#ffffff; font-weight:bold;">
                AGQ Consulting LLC
              </p>
              <p style="margin:0 0 4px 0; font-size:13px; line-height:20px; color:#ffffff;">
                195 International Parkway &nbsp;|&nbsp; Suite 103 &nbsp;|&nbsp; Lake Mary, FL 32746
              </p>
              <p style="margin:0; font-size:13px; line-height:20px; color:#ffffff;">
                Email: <a href="mailto:${SUPPORT_EMAIL}" style="color:#ffffff; text-decoration:underline;">${SUPPORT_EMAIL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Firebase callable function to send invite email to a client
 */
export const sendInviteEmail = onCall<SendInviteEmailRequest, Promise<SendInviteEmailResponse>>(
  {
    cors: true,
    secrets: [resendApiKey],
  },
  async (request) => {
    try {
      if (!request.data.clientName || !request.data.clientEmail || !request.data.clientCid) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required fields: clientName, clientEmail, or clientCid"
        );
      }

      const { clientName, clientEmail, clientCid } = request.data;

      const firstName = clientName.split(" ")[0] || clientName;
      const htmlContent = createEmailTemplate(clientName, clientCid);
      const textContent = createPlainTextEmail(firstName, clientCid);

      const resend = new Resend(resendApiKey.value());

      const { data, error } = await resend.emails.send({
        from: "AGQ <invite@app.agqconsulting.com>",
        to: [clientEmail],
        replyTo: SUPPORT_EMAIL,
        subject: "Welcome to your Investment Management App Invitation",
        html: htmlContent,
        text: textContent,
        attachments: [
          {
            filename: "agq-logo.png",
            content: AGQ_LOGO_BASE64,
            contentId: LOGO_CID,
          },
        ],
      });

      if (error) {
        console.error("Resend API error:", error);
        throw new HttpsError("internal", `Failed to send email: ${error.message}`);
      }

      console.log("Email sent successfully:", data);

      return {
        success: true,
        message: "Invite email sent successfully",
        emailId: data?.id,
      };
    } catch (error) {
      console.error("Error sending invite email:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Failed to send invite email");
    }
  }
);
