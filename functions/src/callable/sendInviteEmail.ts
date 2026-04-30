/**
 * @file sendInviteEmail.ts
 * @description Firebase callable function to send invite emails to clients
 *              using Resend.
 *
 * The HTML body is rendered via React Email (`@react-email/render`) from the
 * `<InviteEmail />` component in ../emails/InviteEmail.tsx. React Email
 * compiles the JSX into the cross-client "bulletproof" table-based HTML
 * pattern, automatically emitting Outlook-safe fallbacks (mso conditionals,
 * VML rectangles for rounded buttons, mso-line-height-rule, etc.) while
 * still producing visually rich output for modern clients (Gmail, Apple
 * Mail, Yahoo, etc.).
 *
 * The AGQ logo is delivered as an inline (CID) attachment via Resend's
 * `contentId` field and referenced in the template as
 * `<img src="cid:agq-logo" />`. This avoids the inline-SVG issue that
 * previously prevented the logo from showing up in Outlook for Windows /
 * Outlook for Mac.
 */

import * as React from "react";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Resend } from "resend";
import { render } from "@react-email/render";

import { InviteEmail } from "../emails/InviteEmail";
import { AGQ_LOGO_BASE64 } from "../assets/agqLogoBase64";

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

/**
 * Build the React element for the invite email. Kept as a separate factory
 * so it can be reused for the HTML render pass and the plain-text render
 * pass without duplicating the prop list.
 */
function buildInviteElement(
  firstName: string,
  clientCid: string
): React.ReactElement {
  return React.createElement(InviteEmail, {
    firstName,
    clientCid,
    logoCid: LOGO_CID,
    iosLink: IOS_LINK,
    androidLink: ANDROID_LINK,
    supportEmail: SUPPORT_EMAIL,
  });
}

export const sendInviteEmail = onCall<
  SendInviteEmailRequest,
  Promise<SendInviteEmailResponse>
>(
  {
    cors: true,
    secrets: [resendApiKey],
  },
  async (request) => {
    try {
      if (
        !request.data.clientName ||
        !request.data.clientEmail ||
        !request.data.clientCid
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required fields: clientName, clientEmail, or clientCid"
        );
      }

      const { clientName, clientEmail, clientCid } = request.data;
      const firstName = clientName.split(" ")[0] || clientName;

      const htmlContent = await render(buildInviteElement(firstName, clientCid));
      const textContent = await render(buildInviteElement(firstName, clientCid), {
        plainText: true,
      });

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
