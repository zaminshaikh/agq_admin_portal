/**
 * @file sendInviteEmail.ts
 * @description Firebase callable function to send invite emails to clients using Resend API
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { Resend } from "resend";

const resend = new Resend("re_fhRUSRpD_GakWwCqJTmSdiyhhfNkwbvDb");

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

/**
 * Creates HTML email template for client invitation
 */
function createEmailTemplate(clientName: string, clientCid: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AGQ Consulting - App Invitation</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .email-container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .content {
                margin-bottom: 30px;
            }
            .steps {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .step {
                margin-bottom: 15px;
            }
            .step strong {
                color: #007bff;
            }
            .download-links {
                background-color: #e7f3ff;
                padding: 15px;
                border-radius: 5px;
                margin: 10px 0;
            }
            .download-links a {
                color: #007bff;
                text-decoration: none;
                font-weight: bold;
            }
            .download-links a:hover {
                text-decoration: underline;
            }
            .cid-highlight {
                background-color: #fff3cd;
                padding: 10px;
                border-radius: 5px;
                font-weight: bold;
                text-align: center;
                font-size: 18px;
                color: #856404;
                margin: 15px 0;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }
            .logo {
                margin: 20px 0;
            }
            .signature {
                margin: 30px 0;
                font-style: italic;
            }
            .disclaimer {
                font-size: 12px;
                color: #666;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }
            .important-note {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                padding: 15px;
                margin: 15px 0;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1 style="color: #007bff;">Welcome to AGQ Consulting!</h1>
            </div>
            
            <div class="content">
                <p>Dear ${clientName},</p>
                
                <p>We hope this message finds you well. AGQ is excited to invite you to sign up with the app!</p>
                
                <p>With this app, you can easily access your up-to-date investment information right from your phone.</p>
                
                <div class="steps">
                    <h3 style="color: #007bff; margin-top: 0;">To get started, please follow these steps:</h3>
                    
                    <div class="step">
                        <strong>1. Click the Link:</strong>
                        <div class="download-links">
                            <strong>For iOS Users:</strong> <a href="https://testflight.apple.com/join/e9kMgByH" target="_blank">https://testflight.apple.com/join/e9kMgByH</a><br>
                            <strong>For Android Users:</strong> <a href="https://play.google.com/apps/internaltest/4701740371572084825" target="_blank">https://play.google.com/apps/internaltest/4701740371572084825</a>
                        </div>
                        <div class="important-note">
                            <strong>Important note:</strong> The app is only available on mobile devices and links must be opened on such devices for download.
                        </div>
                    </div>
                    
                    <div class="step">
                        <strong>2. Enter Your Client ID (CID):</strong>
                        <div class="cid-highlight">
                            Your CID: ${clientCid}
                        </div>
                    </div>
                    
                    <div class="step">
                        <strong>3. Set Up Your Account:</strong> Follow the instructions to create your account using your email and CID. This setup is a one-time process; you will not need to remember your CID for future logins.
                    </div>
                </div>
                
                <p>We've designed the platform to be simple and intuitive. If you have questions or need any assistance, our support team is just a click away at <a href="mailto:management@agqconsulting.com">management@agqconsulting.com</a></p>
                
                <p>Thank you for your continued trust in our team. We are excited to bring you a more convenient and seamless experience with this app.</p>
                
                <div class="signature">
                    <p>Cordially,<br>
                    Sonny and Kash</p>
                </div>
            </div>
            
            <div class="footer">
                <div class="logo">
                    <!-- AGQ Logo placeholder - you can add an actual logo image here -->
                    <div style="background-color: #007bff; color: white; padding: 15px 30px; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 20px;">
                        AGQ CONSULTING
                    </div>
                </div>
                
                <p style="margin: 20px 0; font-weight: bold;">
                    195 International Parkway | Suite 103 | Lake Mary, FL 32746
                </p>
                
                <div class="disclaimer">
                    <p><strong>Confidentiality Disclaimer:</strong> This e-mail and any attachments may contain information that is confidential or otherwise protected from disclosure. Thank you.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Firebase callable function to send invite email to a client
 */
export const sendInviteEmail = onCall<SendInviteEmailRequest, Promise<SendInviteEmailResponse>>(
  {
    cors: true,
  },
  async (request) => {
    try {
      // Validate input
      if (!request.data.clientName || !request.data.clientEmail || !request.data.clientCid) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required fields: clientName, clientEmail, or clientCid"
        );
      }

      const { clientName, clientEmail, clientCid } = request.data;

      // Create email HTML content
      const htmlContent = createEmailTemplate(clientName, clientCid);

      // Send email using Resend
      const { data, error } = await resend.emails.send({
        from: "AGQ Consulting <invite@app.agqconsulting.com>",
        to: [clientEmail],
        replyTo: "management@agqconsulting.com",
        subject: "Welcome to AGQ Consulting - Your App Invitation",
        html: htmlContent,
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
