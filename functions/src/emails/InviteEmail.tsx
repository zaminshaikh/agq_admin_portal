/**
 * @file InviteEmail.tsx
 * @description React Email template for the AGQ client invitation.
 *
 * This template uses @react-email/components which compile JSX into the
 * "bulletproof" table-based HTML pattern. The components automatically emit
 * Outlook-compatible fallbacks (mso-conditional VML, mso-line-height-rule,
 * etc.) while still producing visually rich output (rounded corners, custom
 * fonts, etc.) for modern clients like Gmail and Apple Mail.
 *
 * Render to HTML with `@react-email/render` (see ../callable/sendInviteEmail.ts).
 */

import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface InviteEmailProps {
  firstName: string;
  clientCid: string;
  logoCid: string;
  iosLink: string;
  androidLink: string;
  supportEmail: string;
}

const COLORS = {
  primary: "#0a3464",
  primaryDark: "#082849",
  text: "#3e3e3e",
  mutedText: "#5a5a5a",
  pageBg: "#f5f5f5",
  panelBg: "#f8f9fa",
  cardBg: "#ffffff",
  border: "#e2e6ea",
  warningBg: "#fff8e1",
  warningBorder: "#d4a017",
  cidBg: "#eef2f8",
};

const FONT_BODY =
  "'Open Sans', Arial, Helvetica, 'Segoe UI', Roboto, sans-serif";
const FONT_SERIF =
  "'DM Serif Display', Georgia, 'Times New Roman', Times, serif";
const FONT_MONO = "'Courier New', Courier, monospace";

const styles = {
  body: {
    backgroundColor: COLORS.pageBg,
    fontFamily: FONT_BODY,
    color: COLORS.text,
    margin: 0,
    padding: 0,
  } as React.CSSProperties,
  container: {
    backgroundColor: COLORS.cardBg,
    margin: "24px auto",
    padding: 0,
    maxWidth: 600,
    width: "100%",
    borderRadius: 12,
    border: `1px solid ${COLORS.border}`,
    overflow: "hidden",
  } as React.CSSProperties,
  header: {
    backgroundColor: COLORS.primary,
    backgroundImage: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
    padding: "36px 24px",
    textAlign: "center" as const,
  } as React.CSSProperties,
  headerTitle: {
    fontFamily: FONT_SERIF,
    color: "#ffffff",
    fontSize: 26,
    lineHeight: "32px",
    fontWeight: 400,
    margin: "16px 0 0 0",
    padding: 0,
    letterSpacing: "-0.2px",
  } as React.CSSProperties,
  contentPadding: {
    padding: "32px 32px 8px 32px",
  } as React.CSSProperties,
  greeting: {
    fontSize: 18,
    lineHeight: "26px",
    fontWeight: 700,
    color: COLORS.text,
    margin: "0 0 16px 0",
  } as React.CSSProperties,
  paragraph: {
    fontSize: 16,
    lineHeight: "24px",
    color: COLORS.text,
    margin: "0 0 16px 0",
  } as React.CSSProperties,
  stepsPanel: {
    backgroundColor: COLORS.panelBg,
    borderLeft: `4px solid ${COLORS.primary}`,
    borderRadius: 8,
    padding: "24px",
    margin: "8px 32px 8px 32px",
  } as React.CSSProperties,
  stepsTitle: {
    fontFamily: FONT_SERIF,
    fontSize: 20,
    lineHeight: "26px",
    color: COLORS.text,
    margin: "0 0 20px 0",
    fontWeight: 400,
  } as React.CSSProperties,
  stepCard: {
    backgroundColor: COLORS.cardBg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "20px",
    margin: "0 0 16px 0",
  } as React.CSSProperties,
  stepCardLast: {
    backgroundColor: COLORS.cardBg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "20px",
    margin: 0,
  } as React.CSSProperties,
  stepHeaderRow: {
    margin: 0,
    padding: 0,
  } as React.CSSProperties,
  stepBadge: {
    backgroundColor: COLORS.primary,
    color: "#ffffff",
    width: 28,
    height: 28,
    borderRadius: 14,
    fontFamily: FONT_BODY,
    fontWeight: 700,
    fontSize: 14,
    lineHeight: "28px",
    textAlign: "center" as const,
    display: "inline-block",
    verticalAlign: "middle",
  } as React.CSSProperties,
  stepTitle: {
    fontFamily: FONT_SERIF,
    fontSize: 18,
    lineHeight: "24px",
    color: COLORS.text,
    fontWeight: 400,
    margin: 0,
    padding: "0 0 0 12px",
    display: "inline-block",
    verticalAlign: "middle",
  } as React.CSSProperties,
  stepBodyText: {
    fontSize: 15,
    lineHeight: "22px",
    color: COLORS.text,
    margin: "12px 0 0 0",
  } as React.CSSProperties,
  downloadLabel: {
    fontSize: 15,
    lineHeight: "22px",
    color: COLORS.text,
    fontWeight: 700,
    margin: "12px 0 4px 0",
  } as React.CSSProperties,
  downloadLink: {
    color: COLORS.primary,
    fontSize: 15,
    lineHeight: "22px",
    textDecoration: "underline",
    wordBreak: "break-all" as const,
  } as React.CSSProperties,
  noteBox: {
    backgroundColor: COLORS.warningBg,
    borderLeft: `4px solid ${COLORS.warningBorder}`,
    borderRadius: 6,
    padding: "12px 14px",
    margin: "14px 0 0 0",
  } as React.CSSProperties,
  noteText: {
    fontSize: 14,
    lineHeight: "20px",
    color: COLORS.text,
    margin: 0,
  } as React.CSSProperties,
  cidBox: {
    backgroundColor: COLORS.cidBg,
    border: `2px solid ${COLORS.primary}`,
    borderRadius: 8,
    padding: "18px",
    margin: "14px 0 0 0",
    textAlign: "center" as const,
  } as React.CSSProperties,
  cidLabel: {
    fontSize: 12,
    lineHeight: "16px",
    color: COLORS.primary,
    fontWeight: 700,
    letterSpacing: "1px",
    textTransform: "uppercase" as const,
    margin: "0 0 6px 0",
  } as React.CSSProperties,
  cidValue: {
    fontFamily: FONT_MONO,
    fontSize: 24,
    lineHeight: "30px",
    color: COLORS.text,
    fontWeight: 700,
    letterSpacing: "2px",
    margin: 0,
  } as React.CSSProperties,
  supportPanel: {
    backgroundColor: COLORS.panelBg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "20px",
    margin: "8px 32px 8px 32px",
    textAlign: "center" as const,
  } as React.CSSProperties,
  supportText: {
    fontSize: 15,
    lineHeight: "22px",
    color: COLORS.text,
    margin: "0 0 8px 0",
  } as React.CSSProperties,
  supportContact: {
    fontSize: 15,
    lineHeight: "22px",
    color: COLORS.text,
    margin: 0,
  } as React.CSSProperties,
  signaturePanel: {
    backgroundColor: COLORS.panelBg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "18px 20px",
    margin: "16px 32px 32px 32px",
  } as React.CSSProperties,
  signatureItalic: {
    fontStyle: "italic" as const,
    fontSize: 15,
    lineHeight: "22px",
    color: COLORS.text,
    margin: "0 0 6px 0",
  } as React.CSSProperties,
  signatureName: {
    fontFamily: FONT_SERIF,
    fontSize: 18,
    lineHeight: "24px",
    color: COLORS.text,
    fontWeight: 700,
    margin: "0 0 4px 0",
  } as React.CSSProperties,
  signatureTeam: {
    fontSize: 13,
    lineHeight: "18px",
    color: COLORS.mutedText,
    margin: 0,
  } as React.CSSProperties,
  hrTransparent: {
    borderColor: "transparent",
    borderWidth: 0,
    margin: 0,
    height: 0,
  } as React.CSSProperties,
  footer: {
    backgroundColor: COLORS.primary,
    backgroundImage: `linear-gradient(135deg, ${COLORS.primaryDark} 0%, ${COLORS.primary} 100%)`,
    padding: "28px 24px",
    textAlign: "center" as const,
  } as React.CSSProperties,
  footerTagline: {
    fontFamily: FONT_SERIF,
    fontStyle: "italic" as const,
    fontSize: 15,
    lineHeight: "22px",
    color: "#ffffff",
    margin: "0 0 14px 0",
  } as React.CSSProperties,
  footerCompany: {
    fontSize: 14,
    lineHeight: "20px",
    color: "#ffffff",
    fontWeight: 700,
    margin: "0 0 6px 0",
  } as React.CSSProperties,
  footerLine: {
    fontSize: 13,
    lineHeight: "20px",
    color: "#ffffff",
    margin: "0 0 4px 0",
  } as React.CSSProperties,
  footerLineLast: {
    fontSize: 13,
    lineHeight: "20px",
    color: "#ffffff",
    margin: 0,
  } as React.CSSProperties,
  footerLink: {
    color: "#ffffff",
    textDecoration: "underline",
  } as React.CSSProperties,
};

export const InviteEmail: React.FC<InviteEmailProps> = ({
  firstName,
  clientCid,
  logoCid,
  iosLink,
  androidLink,
  supportEmail,
}) => {
  return (
    <Html lang="en">
      <Head>
        <meta name="x-apple-disable-message-reformatting" />
        <meta
          name="format-detection"
          content="telephone=no, date=no, address=no, email=no"
        />
        {/*
          We avoid React Email's <Font> component because each instance emits
          a global `* { font-family: ... }` rule and the last one wins,
          stomping on inline font-family declarations elsewhere in the
          template. Loading the Google fonts via a regular @import here
          works in Gmail / Apple Mail (and is silently ignored by Outlook,
          which falls back to the inline Georgia / Arial declarations on
          each element).
        */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Open+Sans:wght@400;600;700&display=swap');
        `}</style>
      </Head>
      <Preview>
        Your AGQ Investment Management App invitation and Client ID are inside.
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Img
              src={`cid:${logoCid}`}
              alt="AGQ"
              width="160"
              height="101"
              style={{
                display: "block",
                margin: "0 auto",
                width: 160,
                height: "auto",
                maxWidth: 160,
                border: 0,
                outline: "none",
                textDecoration: "none",
              }}
            />
            <Heading as="h1" style={styles.headerTitle}>
              Welcome to your Investment
              <br />
              Management App Invitation
            </Heading>
          </Section>

          <Section style={styles.contentPadding}>
            <Text style={styles.greeting}>Dear {firstName},</Text>
            <Text style={styles.paragraph}>
              We hope this message finds you well. AGQ is pleased to invite you
              to access your investment portfolio through our secure mobile
              application.
            </Text>
            <Text style={styles.paragraph}>
              With this app, you can conveniently monitor your up-to-date
              investment information, track performance, and stay connected
              with your financial growth&mdash;all from your mobile device.
            </Text>
          </Section>

          <Section style={styles.stepsPanel}>
            <Heading as="h2" style={styles.stepsTitle}>
              Getting Started &mdash; Three Simple Steps
            </Heading>

            <Section style={styles.stepCard}>
              <Section style={styles.stepHeaderRow}>
                <span style={styles.stepBadge}>1</span>
                <span style={styles.stepTitle}>Download the Application</span>
              </Section>
              <Text style={styles.downloadLabel}>For iOS Users:</Text>
              <Link href={iosLink} style={styles.downloadLink}>
                {iosLink}
              </Link>
              <Text style={styles.downloadLabel}>For Android Users:</Text>
              <Link href={androidLink} style={styles.downloadLink}>
                {androidLink}
              </Link>
              <Section style={styles.noteBox}>
                <Text style={styles.noteText}>
                  <strong style={{ color: COLORS.primary }}>Important:</strong>{" "}
                  The application is exclusively available on mobile devices.
                  Please open the download links directly on your smartphone or
                  tablet.
                </Text>
              </Section>
            </Section>

            <Section style={styles.stepCard}>
              <Section style={styles.stepHeaderRow}>
                <span style={styles.stepBadge}>2</span>
                <span style={styles.stepTitle}>
                  Enter Your Client Identification Number
                </span>
              </Section>
              <Section style={styles.cidBox}>
                <Text style={styles.cidLabel}>Your Client ID (CID)</Text>
                <Text style={styles.cidValue}>{clientCid}</Text>
              </Section>
            </Section>

            <Section style={styles.stepCardLast}>
              <Section style={styles.stepHeaderRow}>
                <span style={styles.stepBadge}>3</span>
                <span style={styles.stepTitle}>Complete Account Setup</span>
              </Section>
              <Text style={styles.stepBodyText}>
                Follow the guided instructions to create your secure account
                using your email address and Client ID. This is a one-time
                setup process&mdash;your CID will not be required for future
                logins.
              </Text>
            </Section>
          </Section>

          <Section style={styles.supportPanel}>
            <Text style={styles.supportText}>
              Our platform is designed with simplicity and security in mind.
              Should you require any assistance during the setup process or
              have questions about your account, our dedicated support team is
              readily available.
            </Text>
            <Text style={styles.supportContact}>
              <strong>Contact Support:</strong>{" "}
              <Link
                href={`mailto:${supportEmail}`}
                style={{
                  color: COLORS.primary,
                  fontWeight: 700,
                  textDecoration: "underline",
                }}
              >
                {supportEmail}
              </Link>
            </Text>
          </Section>

          <Section style={styles.contentPadding}>
            <Text style={styles.paragraph}>
              Thank you for your continued trust in AGQ. We are excited to
              provide you with enhanced accessibility and a more streamlined
              experience through this mobile platform.
            </Text>
          </Section>

          <Section style={styles.signaturePanel}>
            <Text style={styles.signatureItalic}>
              With humility and continued gratitude,
            </Text>
            <Text style={styles.signatureName}>Sonny and Kash Shaikh</Text>
            <Text style={styles.signatureTeam}>AGQ Team</Text>
          </Section>

          <Hr style={styles.hrTransparent} />

          <Section style={styles.footer}>
            <Text style={styles.footerTagline}>
              &ldquo;Planning Today, Securing Tomorrow&rdquo;
            </Text>
            <Text style={styles.footerCompany}>AGQ Consulting LLC</Text>
            <Text style={styles.footerLine}>
              195 International Parkway &nbsp;|&nbsp; Suite 103 &nbsp;|&nbsp;
              Lake Mary, FL 32746
            </Text>
            <Text style={styles.footerLineLast}>
              Email:{" "}
              <Link href={`mailto:${supportEmail}`} style={styles.footerLink}>
                {supportEmail}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default InviteEmail;
