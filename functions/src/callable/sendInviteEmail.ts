/**
 * @file sendInviteEmail.ts
 * @description Firebase callable function to send invite emails to clients using Resend API
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Resend } from "resend";

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

/**
 * Creates HTML email template for client invitation
 */
function createEmailTemplate(clientName: string, clientCid: string): string {
  // Update the iOS link in the email template
  const iosLink = "https://apps.apple.com/us/app/agq/id6502013306";
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AGQ - App Invitation</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Open+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #3e3e3e;
                max-width: 650px;
                margin: 0 auto;
                padding: 0;
                background-color: #f5f5f5;
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }
            /* Prevent dark mode from inverting colors */
            @media (prefers-color-scheme: dark) {
                body, .email-container, .header, .content, .footer {
                    color-scheme: light !important;
                }
            }
            .email-container {
                background-color: #ffffff;
                margin: 20px;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(62,62,62,0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #0a3464 0%, #3e3e3e 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
                position: relative;
            }
            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
                opacity: 0.3;
            }
            .agq-logo {
                position: relative;
                z-index: 2;
                margin-bottom: 20px;
            }
            .header h1 {
                font-family: 'DM Serif Display', serif;
                font-size: 32px;
                font-weight: 400;
                margin: 0;
                letter-spacing: -0.5px;
                position: relative;
                z-index: 2;
            }
            .header p {
                font-size: 16px;
                margin: 10px 0 0 0;
                opacity: 0.9;
                font-weight: 300;
                position: relative;
                z-index: 2;
            }
            .content {
                padding: 40px 30px;
                background-color: #ffffff;
            }
            .greeting {
                font-size: 18px;
                font-weight: 500;
                color: #3e3e3e;
                margin-bottom: 20px;
            }
            .intro-text {
                font-size: 16px;
                color: #3e3e3e;
                margin-bottom: 30px;
                line-height: 1.7;
            }
            .steps-container {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 30px;
                margin: 30px 0;
                border-left: 4px solid #0a3464;
            }
            .steps-title {
                font-family: 'DM Serif Display', serif;
                color: #3e3e3e;
                font-size: 22px;
                font-weight: 400;
                margin: 0 0 25px 0;
                display: flex;
                align-items: center;
            }
            .step {
                margin-bottom: 25px;
                padding: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(62,62,62,0.05);
            }
            .step:last-child {
                margin-bottom: 0;
            }
            .step-number {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                background: #0a3464;
                color: white;
                border-radius: 50%;
                font-weight: 600;
                font-size: 14px;
                margin-right: 12px;
            }
            .step-title {
                font-family: 'DM Serif Display', serif;
                color: #3e3e3e;
                font-weight: 400;
                font-size: 18px;
                margin-bottom: 12px;
            }
            .download-section {
                background: rgba(10,52,100,0.1);
                padding: 20px;
                border-radius: 8px;
                margin: 15px 0;
            }
            .download-link {
                display: block;
                color: #0a3464;
                text-decoration: none;
                font-weight: 500;
                padding: 8px 0;
                border-bottom: 1px solid rgba(10,52,100,0.2);
                transition: all 0.3s ease;
            }
            .download-link:last-child {
                border-bottom: none;
            }
            .download-link:hover {
                color: #3e3e3e;
                text-decoration: underline;
            }
            .cid-highlight {
                background: rgba(10,52,100,0.1);
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                margin: 15px 0;
                border: 2px solid #0a3464;
            }
            .cid-label {
                font-size: 14px;
                font-weight: 500;
                color: #0a3464;
                margin-bottom: 5px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .cid-value {
                font-size: 24px;
                font-weight: 700;
                color: #3e3e3e;
                font-family: 'Courier New', monospace;
                letter-spacing: 2px;
            }
            .important-note {
                background: rgba(62,62,62,0.05);
                border: 1px solid rgba(62,62,62,0.2);
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
                border-left: 4px solid #3e3e3e;
            }
            .important-note strong {
                color: #0a3464;
            }
            .support-section {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 30px 0;
                text-align: center;
            }
            .support-email {
                color: #0a3464;
                text-decoration: none;
                font-weight: 600;
            }
            .signature {
                margin: 30px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
                font-style: italic;
                color: #3e3e3e;
            }
            .footer {
                background: linear-gradient(135deg, #3e3e3e 0%, #0a3464 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }
            .footer-logo {
                margin-bottom: 25px;
            }
            .company-info {
                font-size: 14px;
                margin: 15px 0;
                opacity: 0.9;
            }
            .disclaimer {
                font-size: 12px;
                opacity: 0.8;
                margin-top: 25px;
                padding-top: 25px;
                border-top: 1px solid rgba(255,255,255,0.2);
                line-height: 1.5;
            }
            .tagline {
                font-family: 'DM Serif Display', serif;
                font-size: 16px;
                font-style: italic;
                opacity: 0.8;
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <div class="agq-logo">
                    <svg width="200" height="126" viewBox="0 0 480 303">
                        <g>
                            <path d="m 0,0 c 0.108,-10.943 1.636,-21.406 5.355,-31.466 4.077,-11.024 9.894,-20.939 19.296,-28.326 10.309,-8.1 21.767,-10.619 34.292,-6.098 8.699,3.141 15.162,9.287 20.433,16.67 9.706,13.597 13.851,29.045 14.549,45.521 C 94.331,5.868 93.289,15.32 90.637,24.54 86.767,37.99 80.551,50.091 69.418,59.032 58.577,67.74 46.53,70.042 33.502,64.501 24.643,60.733 18.211,54.059 13.042,46.137 3.851,32.052 0.219,16.374 0,0 m 65.479,-71.015 c 7.189,-2.802 13.604,-6.572 20.487,-9.315 7.996,-3.186 15.896,-1.869 23.705,0.815 3.216,1.105 6.333,2.456 9.075,4.684 0.757,-0.841 1.451,-1.614 2.21,-2.457 -0.773,-2.927 -2.185,-5.523 -3.871,-7.955 -3.451,-4.979 -7.234,-9.678 -13.092,-11.994 -9.191,-3.634 -17.639,-2.343 -25.342,3.969 -5.375,4.405 -10.255,9.372 -15.793,13.589 -3.664,2.791 -7.397,5.397 -12.087,6.109 -1.65,0.25 -3.32,0.477 -4.985,0.503 -22.43,0.349 -40.721,9.446 -55.081,26.418 -9.063,10.71 -14.433,23.166 -16.082,37.174 -2.378,20.199 2.514,38.452 15.127,54.379 11.11,14.029 25.563,23.004 43.27,26.299 21.819,4.059 41.71,-0.637 59.196,-14.259 13.42,-10.455 22.059,-24.225 25.972,-40.825 1.817,-7.705 2.283,-15.556 1.509,-23.426 -1.382,-14.052 -6.429,-26.709 -15.172,-37.804 -9.875,-12.532 -22.46,-21.117 -37.913,-25.379 -0.292,-0.081 -0.559,-0.255 -1.133,-0.525" style="fill:white;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.3333333,0,0,-1.3333333,268.25907,133.86747)" />
                            <path d="M 0,0 C 2.873,-1.79 6.175,-2.647 9.581,-4.16 -0.71,-6.796 -10.71,-7.704 -20.943,-7.044 c -16.54,1.065 -31.724,5.919 -45.354,15.356 -15.101,10.456 -25.817,24.201 -29.965,42.303 -4.908,21.413 -0.034,40.748 14.08,57.525 12.584,14.955 28.853,24.067 47.85,28.244 8.436,1.855 17.03,2.389 25.701,1.722 6.102,-0.469 12.107,-1.343 18.452,-2.93 -3.921,-1.451 -7.496,-2.751 -10.745,-4.76 -4.136,1.352 -8.259,2.27 -12.56,2.449 -12.099,0.506 -22.824,-3.209 -32.258,-10.584 -13.721,-10.727 -21.623,-24.989 -24.799,-41.973 -3.556,-19.021 -0.914,-37.091 9.035,-53.783 7.064,-11.853 16.687,-21.044 29.953,-25.793 9.89,-3.54 19.954,-3.836 30.099,-1.061 C -0.984,-0.201 -0.503,-0.113 0,0" style="fill:white;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.3333333,0,0,-1.3333333,281.2344,221.44747)" />
                            <path d="m 0,0 c 0.037,-0.725 0.067,-1.326 0.102,-2.016 h -34.925 c -0.323,0.718 -0.22,1.423 -0.052,2.186 4.525,0.017 8.729,0.93 12.181,4.073 1.721,1.566 3.019,3.351 3.795,5.607 15.158,44.077 30.358,88.14 45.553,132.204 0.217,0.63 0.487,1.242 0.735,1.868 h 6.338 C 37.886,131.94 42.041,119.971 46.212,107.958 38.131,95.012 34.138,80.972 35.167,65.543 30.378,78.959 25.589,92.375 20.644,106.232 14.299,87.631 8.087,69.42 1.795,50.97 h 36.44 c 0.597,-1.697 1.138,-3.237 1.744,-4.963 H -0.097 C -3.418,36.495 -6.704,27.09 -9.986,17.686 c -0.952,-2.73 -1.908,-5.458 -2.842,-8.194 -1.152,-3.378 -0.09,-5.896 3.125,-7.516 1.502,-0.757 3.096,-1.22 4.75,-1.447 C -3.365,0.311 -1.764,0.185 0,0" style="fill:white;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.3333333,0,0,-1.3333333,97.177733,228.9136)" />
                            <path d="m 0,0 c 2.944,-3.759 5.933,-7.454 9.251,-10.89 7.53,-7.799 16.222,-13.922 26.158,-18.265 0.932,-0.407 1.667,-0.892 2.275,-1.747 1.862,-2.619 4.665,-3.511 7.689,-3.901 0.855,-0.11 1.742,0.011 2.557,-0.333 0.331,-0.537 0.121,-1.096 0.185,-1.772 H -3.922 c -0.363,0.477 -0.13,1.084 -0.097,1.841 2.082,0.377 4.27,0.257 6.303,0.993 0.809,0.293 1.66,0.487 2.442,0.838 4.115,1.851 5.336,4.823 3.815,9.063 -2.806,7.82 -5.587,15.65 -8.374,23.477 C 0.087,-0.473 0.054,-0.233 0,0" style="fill:white;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.3333333,0,0,-1.3333333,158.3828,182.32507)" />
                            <path d="m 0,0 v 32.179 c 0,8.035 -4.235,12.029 -12.332,11.635 -0.175,-0.008 -0.352,0.021 -0.539,0.033 -0.349,0.67 -0.093,1.352 -0.211,2.158 h 51.833 v -1.784 c -2.267,-0.34 -4.56,-0.268 -6.73,-1.128 C 28.007,41.503 26.026,38.79 26.022,34.466 26.008,20.504 26.013,6.542 26.01,-7.42 v -1.996 c -3.203,-1.807 -6.263,-3.533 -9.472,-5.343 C 9.749,-11.308 4.211,-6.451 0,0" style="fill:white;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.3333333,0,0,-1.3333333,293.64453,199.77827)" />
                            <path d="M 0,0 C 3.328,3.171 6.632,6.082 10.725,7.959 11.468,8.3 12.16,8.204 13.129,7.713 15.78,-2.889 18.479,-13.674 21.214,-24.61 H 17.907 C 13.591,-15.494 8.479,-6.705 0,0" style="fill:white;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.3333333,0,0,-1.3333333,300.91533,60.260667)" />
                        </g>
                    </svg>
                </div>
                <h1>Welcome to AGQ</h1>
                <p>Your Investment Management App Invitation</p>
            </div>
            
            <div class="content">
                <div class="greeting">Dear ${clientName},</div>
                
                <div class="intro-text">
                    We hope this message finds you well. AGQ is pleased to invite you to access your investment portfolio through our secure mobile application.
                    <br><br>
                    With this app, you can conveniently monitor your up-to-date investment information, track performance, and stay connected with your financial growth—all from your mobile device.
                </div>
                
                <div class="steps-container">
                    <div class="steps-title">
                        📱 Getting Started - Three Simple Steps:
                    </div>
                    
                    <div class="step">
                        <div class="step-title">
                            <span class="step-number">1</span>
                            Download the Application
                        </div>
                        <div class="download-section">
                            <strong>For iOS Users:</strong>
                            <a href="${iosLink}" class="download-link" target="_blank">${iosLink}</a>
                            <strong>For Android Users:</strong>
                            <a href="https://play.google.com/store/apps/details?id=com.teamshaikh.investmentportfolio" class="download-link" target="_blank">https://play.google.com/store/apps/details?id=com.teamshaikh.investmentportfolio</a>
                        </div>
                        <div class="important-note">
                            <strong>Important:</strong> The application is exclusively available on mobile devices. Please ensure you open the download links directly on your smartphone or tablet.
                        </div>
                    </div>
                    
                    <div class="step">
                        <div class="step-title">
                            <span class="step-number">2</span>
                            Enter Your Client Identification Number
                        </div>
                        <div class="cid-highlight">
                            <div class="cid-label">Your Client ID (CID)</div>
                            <div class="cid-value">${clientCid}</div>
                        </div>
                    </div>
                    
                    <div class="step">
                        <div class="step-title">
                            <span class="step-number">3</span>
                            Complete Account Setup
                        </div>
                        <p style="margin: 10px 0; color: #34495e;">Follow the guided instructions to create your secure account using your email address and Client ID. This is a one-time setup process—your CID will not be required for future logins.</p>
                    </div>
                </div>
                
                <div class="support-section">
                    <p style="margin: 0 0 10px 0; color: #2c3e50;">Our platform is designed with simplicity and security in mind. Should you require any assistance during the setup process or have questions about your account, our dedicated support team is readily available.</p>
                    <p style="margin: 10px 0 0 0;">
                        <strong>Contact Support:</strong> 
                        <a href="mailto:management@agqconsulting.com" class="support-email">management@agqconsulting.com</a>
                    </p>
                </div>
                
                <div class="intro-text">
                    Thank you for your continued trust in AGQ. We are excited to provide you with enhanced accessibility and a more streamlined experience through this mobile platform.
                </div>
                
                <div class="signature">
                    <p style="margin: 0;">Cordially,</p>
                    <p style="margin: 5px 0 0 0;"><strong>Sonny and Kash</strong></p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">AGQ Team</p>
                </div>
            </div>
            
            <div class="footer">
                <div class="tagline">"Planning Today, Securing Tomorrow"</div>
                
                <div class="footer-logo">
                    <svg width="160" height="100" viewBox="0 0 480 303" style="opacity: 0.9;">
                        <g>
                            <path d="m 0,0 c 0.108,-10.943 1.636,-21.406 5.355,-31.466 4.077,-11.024 9.894,-20.939 19.296,-28.326 10.309,-8.1 21.767,-10.619 34.292,-6.098 8.699,3.141 15.162,9.287 20.433,16.67 9.706,13.597 13.851,29.045 14.549,45.521 C 94.331,5.868 93.289,15.32 90.637,24.54 86.767,37.99 80.551,50.091 69.418,59.032 58.577,67.74 46.53,70.042 33.502,64.501 24.643,60.733 18.211,54.059 13.042,46.137 3.851,32.052 0.219,16.374 0,0 m 65.479,-71.015 c 7.189,-2.802 13.604,-6.572 20.487,-9.315 7.996,-3.186 15.896,-1.869 23.705,0.815 3.216,1.105 6.333,2.456 9.075,4.684 0.757,-0.841 1.451,-1.614 2.21,-2.457 -0.773,-2.927 -2.185,-5.523 -3.871,-7.955 -3.451,-4.979 -7.234,-9.678 -13.092,-11.994 -9.191,-3.634 -17.639,-2.343 -25.342,3.969 -5.375,4.405 -10.255,9.372 -15.793,13.589 -3.664,2.791 -7.397,5.397 -12.087,6.109 -1.65,0.25 -3.32,0.477 -4.985,0.503 -22.43,0.349 -40.721,9.446 -55.081,26.418 -9.063,10.71 -14.433,23.166 -16.082,37.174 -2.378,20.199 2.514,38.452 15.127,54.379 11.11,14.029 25.563,23.004 43.27,26.299 21.819,4.059 41.71,-0.637 59.196,-14.259 13.42,-10.455 22.059,-24.225 25.972,-40.825 1.817,-7.705 2.283,-15.556 1.509,-23.426 -1.382,-14.052 -6.429,-26.709 -15.172,-37.804 -9.875,-12.532 -22.46,-21.117 -37.913,-25.379 -0.292,-0.081 -0.559,-0.255 -1.133,-0.525" style="fill:white;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.3333333,0,0,-1.3333333,268.25907,133.86747)" />
                            <path d="M 0,0 C 2.873,-1.79 6.175,-2.647 9.581,-4.16 -0.71,-6.796 -10.71,-7.704 -20.943,-7.044 c -16.54,1.065 -31.724,5.919 -45.354,15.356 -15.101,10.456 -25.817,24.201 -29.965,42.303 -4.908,21.413 -0.034,40.748 14.08,57.525 12.584,14.955 28.853,24.067 47.85,28.244 8.436,1.855 17.03,2.389 25.701,1.722 6.102,-0.469 12.107,-1.343 18.452,-2.93 -3.921,-1.451 -7.496,-2.751 -10.745,-4.76 -4.136,1.352 -8.259,2.27 -12.56,2.449 -12.099,0.506 -22.824,-3.209 -32.258,-10.584 -13.721,-10.727 -21.623,-24.989 -24.799,-41.973 -3.556,-19.021 -0.914,-37.091 9.035,-53.783 7.064,-11.853 16.687,-21.044 29.953,-25.793 9.89,-3.54 19.954,-3.836 30.099,-1.061 C -0.984,-0.201 -0.503,-0.113 0,0" style="fill:white;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.3333333,0,0,-1.3333333,281.2344,221.44747)" />
                            <path d="m 0,0 c 0.037,-0.725 0.067,-1.326 0.102,-2.016 h -34.925 c -0.323,0.718 -0.22,1.423 -0.052,2.186 4.525,0.017 8.729,0.93 12.181,4.073 1.721,1.566 3.019,3.351 3.795,5.607 15.158,44.077 30.358,88.14 45.553,132.204 0.217,0.63 0.487,1.242 0.735,1.868 h 6.338 C 37.886,131.94 42.041,119.971 46.212,107.958 38.131,95.012 34.138,80.972 35.167,65.543 30.378,78.959 25.589,92.375 20.644,106.232 14.299,87.631 8.087,69.42 1.795,50.97 h 36.44 c 0.597,-1.697 1.138,-3.237 1.744,-4.963 H -0.097 C -3.418,36.495 -6.704,27.09 -9.986,17.686 c -0.952,-2.73 -1.908,-5.458 -2.842,-8.194 -1.152,-3.378 -0.09,-5.896 3.125,-7.516 1.502,-0.757 3.096,-1.22 4.75,-1.447 C -3.365,0.311 -1.764,0.185 0,0" style="fill:white;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.3333333,0,0,-1.3333333,97.177733,228.9136)" />
                            <path d="m 0,0 c 2.944,-3.759 5.933,-7.454 9.251,-10.89 7.53,-7.799 16.222,-13.922 26.158,-18.265 0.932,-0.407 1.667,-0.892 2.275,-1.747 1.862,-2.619 4.665,-3.511 7.689,-3.901 0.855,-0.11 1.742,0.011 2.557,-0.333 0.331,-0.537 0.121,-1.096 0.185,-1.772 H -3.922 c -0.363,0.477 -0.13,1.084 -0.097,1.841 2.082,0.377 4.27,0.257 6.303,0.993 0.809,0.293 1.66,0.487 2.442,0.838 4.115,1.851 5.336,4.823 3.815,9.063 -2.806,7.82 -5.587,15.65 -8.374,23.477 C 0.087,-0.473 0.054,-0.233 0,0" style="fill:white;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.3333333,0,0,-1.3333333,158.3828,182.32507)" />
                            <path d="m 0,0 v 32.179 c 0,8.035 -4.235,12.029 -12.332,11.635 -0.175,-0.008 -0.352,0.021 -0.539,0.033 -0.349,0.67 -0.093,1.352 -0.211,2.158 h 51.833 v -1.784 c -2.267,-0.34 -4.56,-0.268 -6.73,-1.128 C 28.007,41.503 26.026,38.79 26.022,34.466 26.008,20.504 26.013,6.542 26.01,-7.42 v -1.996 c -3.203,-1.807 -6.263,-3.533 -9.472,-5.343 C 9.749,-11.308 4.211,-6.451 0,0" style="fill:white;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.3333333,0,0,-1.3333333,293.64453,199.77827)" />
                            <path d="M 0,0 C 3.328,3.171 6.632,6.082 10.725,7.959 11.468,8.3 12.16,8.204 13.129,7.713 15.78,-2.889 18.479,-13.674 21.214,-24.61 H 17.907 C 13.591,-15.494 8.479,-6.705 0,0" style="fill:white;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.3333333,0,0,-1.3333333,300.91533,60.260667)" />
                        </g>
                    </svg>
                </div>
                
                <div class="company-info">
                    <strong>AGQ Consulting LLC</strong><br>
                    195 International Parkway | Suite 103 | Lake Mary, FL 32746<br>
                    Email: management@agqconsulting.com
                </div>
                
                <div class="disclaimer">
                    <strong>Confidentiality Disclaimer:</strong> This e-mail and any attachments may contain information that is confidential, proprietary, or otherwise protected from disclosure. If you are not the intended recipient, please notify the sender immediately and delete this message. Any unauthorized use, disclosure, or distribution is strictly prohibited. Thank you.
                    <br><br>
                    <em>AGQ Consulting is a Florida based Private Equity Hedge Fund that is exempted from the registration requirements of the Investment Company Act of 1940. Our private offerings are available to accredited investors and rely on the offering exemption under Rule 506 of Regulation D under the Securities Act of 1933.</em>
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
    secrets: [resendApiKey], // Specify that this function uses the secret
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

      // Initialize Resend with the secret API key
      const resend = new Resend(resendApiKey.value());

      // Send email using Resend
      const { data, error } = await resend.emails.send({
        from: "AGQ <invite@app.agqconsulting.com>",
        to: [clientEmail],
        replyTo: "management@agqconsulting.com",
        subject: "Welcome to AGQ - Your App Invitation",
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
