/**
 * @file InviteEmail.tsx
 * @description React Email template for the AGQ client invitation.
 *
 * The template uses @react-email/components for the structural pieces
 * (<Html>, <Body>, <Container>, <Heading>, <Text>, <Img>, <Link>) which
 * compile JSX into bulletproof table-based HTML.
 *
 * For the *colored* regions (header, footer, step number badges, CID box,
 * support panel, signature panel, "important" callout) the template drops
 * down to raw <table bgcolor="..."> markup. This is intentional: Outlook,
 * especially "New Outlook for Windows" (Webview2 / Edge engine) and
 * Outlook 365 webmail in dark mode, aggressively strips inline
 * `background-color` CSS but respects the legacy `bgcolor=""` HTML
 * attribute. Keeping both means the email renders consistently in
 * Outlook light AND dark mode, in addition to Gmail / Apple Mail.
 *
 * The <Head> also includes:
 *   - color-scheme meta tags that opt the message out of automatic dark
 *     mode in iOS Mail and Outlook 365.
 *   - <!--[if mso]> conditional VML rectangles that paint the header /
 *     footer background in Classic Outlook even when CSS backgrounds are
 *     stripped.
 *   - [data-ogsc] / [data-ogsb] selectors that re-assert colors inside
 *     Outlook 365 webmail dark mode (which wraps content in those data
 *     attributes when inverting colors).
 *
 * Render to HTML with `@react-email/render` (see ../callable/sendInviteEmail.ts).
 */

import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
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

/*
 * Color palette.
 *
 * IMPORTANT: the panel / CID / note background colors are intentionally
 * pushed slightly more saturated than a typical "near-white tint" (e.g.
 * #ebeff5 instead of #f8f9fa). This is because Outlook 365 webmail and
 * "New Outlook for Windows" (Webview2 / Edge engine) run an automatic
 * color adjustment that inverts colors it considers to be "page
 * background tint" - which catches near-white tinted colors like
 * #f8f9fa, #fff8e1, and #eef2f8 - while leaving pure #ffffff cards
 * and saturated brand colors alone.
 *
 * By moving the panel colors a few percent further from white, Outlook
 * treats them as intentional design colors and renders them as-is.
 * The colors still read as subtle "layered" panels in Apple Mail /
 * Gmail, matching the intended visual hierarchy.
 */
const COLORS = {
  primary: "#0a3464",
  primaryDark: "#082849",
  text: "#3e3e3e",
  mutedText: "#5a5a5a",
  pageBg: "#f5f5f5",
  panelBg: "#ebeff5",
  cardBg: "#ffffff",
  border: "#d8dde4",
  warningBg: "#fde9b3",
  warningBorder: "#c89009",
  cidBg: "#d4e0f2",
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
  stepsTitle: {
    fontFamily: FONT_SERIF,
    fontSize: 20,
    lineHeight: "26px",
    color: COLORS.text,
    margin: "0 0 20px 0",
    fontWeight: 400,
  } as React.CSSProperties,
  stepTitle: {
    fontFamily: FONT_SERIF,
    fontSize: 18,
    lineHeight: "24px",
    color: COLORS.text,
    fontWeight: 400,
    margin: 0,
    padding: 0,
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
  inlineLink: {
    color: COLORS.primary,
    fontWeight: 700,
    textDecoration: "underline",
  } as React.CSSProperties,
  cidNote: {
    fontSize: 13,
    lineHeight: "18px",
    color: COLORS.mutedText,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    margin: "10px 0 0 0",
  } as React.CSSProperties,
  noteText: {
    fontSize: 14,
    lineHeight: "20px",
    color: COLORS.text,
    margin: 0,
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
};

/**
 * The CSS injected into <head>. Intentionally short.
 * The selectors below target Outlook 365 webmail's dark mode wrappers,
 * forcing our colors back even when Outlook tries to invert them.
 */
const HEAD_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Open+Sans:wght@400;600;700&display=swap');

  /* Outlook 365 webmail dark mode: re-assert colors that get inverted. */
  [data-ogsc] td.agq-header,
  [data-ogsb] td.agq-header {
    background-color: ${COLORS.primary} !important;
    background-image: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%) !important;
    color: #ffffff !important;
  }
  [data-ogsc] td.agq-footer,
  [data-ogsb] td.agq-footer {
    background-color: ${COLORS.primary} !important;
    background-image: linear-gradient(135deg, ${COLORS.primaryDark} 0%, ${COLORS.primary} 100%) !important;
    color: #ffffff !important;
  }
  [data-ogsc] td.agq-card,
  [data-ogsb] td.agq-card {
    background-color: ${COLORS.cardBg} !important;
    color: ${COLORS.text} !important;
  }
  [data-ogsc] td.agq-panel,
  [data-ogsb] td.agq-panel {
    background-color: ${COLORS.panelBg} !important;
    color: ${COLORS.text} !important;
  }
  [data-ogsc] td.agq-cid,
  [data-ogsb] td.agq-cid {
    background-color: ${COLORS.cidBg} !important;
    color: ${COLORS.text} !important;
  }
  [data-ogsc] td.agq-note,
  [data-ogsb] td.agq-note {
    background-color: ${COLORS.warningBg} !important;
    color: ${COLORS.text} !important;
  }
  [data-ogsc] td.agq-badge,
  [data-ogsb] td.agq-badge {
    background-color: ${COLORS.primary} !important;
    color: #ffffff !important;
  }
  [data-ogsc] .agq-text-light,
  [data-ogsb] .agq-text-light {
    color: #ffffff !important;
  }
  [data-ogsc] .agq-text-dark,
  [data-ogsb] .agq-text-dark {
    color: ${COLORS.text} !important;
  }
  [data-ogsc] .agq-text-primary,
  [data-ogsb] .agq-text-primary {
    color: ${COLORS.primary} !important;
  }

  /*
   * Always-on color enforcement (light mode AND dark mode).
   *
   * Outlook 365 webmail and "New Outlook for Windows" run an automatic
   * color adjustment that can re-tint or invert background colors even
   * when the UI is in light mode (it reacts to the *system* color
   * scheme, not the Outlook UI preference). The rules below set our
   * intended palette with !important at the top of the cascade, so
   * even when Outlook applies its own inline overrides, ours win.
   *
   * Pure-white step cards and pure-navy header/footer are always
   * preserved by Outlook untouched, so they do not need a rule here.
   */
  td.agq-panel { background-color: ${COLORS.panelBg} !important; }
  td.agq-cid { background-color: ${COLORS.cidBg} !important; }
  td.agq-note { background-color: ${COLORS.warningBg} !important; }

  /* Apple / iOS Mail: opt every panel out of color-scheme inversion. */
  :root {
    color-scheme: light only;
    supported-color-schemes: light only;
  }

  @media (prefers-color-scheme: dark) {
    .agq-header { background-color: ${COLORS.primary} !important; }
    .agq-footer { background-color: ${COLORS.primary} !important; }
    .agq-card { background-color: ${COLORS.cardBg} !important; }
    .agq-panel { background-color: ${COLORS.panelBg} !important; }
    .agq-cid { background-color: ${COLORS.cidBg} !important; }
    .agq-note { background-color: ${COLORS.warningBg} !important; }
    .agq-badge { background-color: ${COLORS.primary} !important; }
    .agq-text-light { color: #ffffff !important; }
    .agq-text-dark { color: ${COLORS.text} !important; }
    .agq-text-primary { color: ${COLORS.primary} !important; }
  }
`;

/**
 * MSO-conditional VML rectangles for the header and footer. These give
 * Classic Outlook (Word renderer) a guaranteed colored background even
 * when it strips inline `background-color` styles.
 */
const HEADER_VML_OPEN = `<!--[if mso]>
<v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:185px;">
  <v:fill type="gradient" color="${COLORS.primary}" color2="${COLORS.primaryDark}" angle="135" />
  <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
<![endif]-->`;
const HEADER_VML_CLOSE = `<!--[if mso]>
  </v:textbox>
</v:rect>
<![endif]-->`;

const FOOTER_VML_OPEN = `<!--[if mso]>
<v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:160px;">
  <v:fill type="gradient" color="${COLORS.primaryDark}" color2="${COLORS.primary}" angle="135" />
  <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
<![endif]-->`;
const FOOTER_VML_CLOSE = `<!--[if mso]>
  </v:textbox>
</v:rect>
<![endif]-->`;

/**
 * `bgcolor=""` was removed from React 19's `<td>` / `<table>` typings,
 * but the attribute is still valid HTML and is the only way to get
 * Outlook (especially in dark mode) to actually paint a background.
 * This helper builds the prop object with the correct runtime keys
 * while satisfying TypeScript.
 */
function bgcolorProps(color: string): { bgcolor: string } {
  return { bgcolor: color } as unknown as { bgcolor: string };
}

/**
 * Renders a numbered "step" badge: a 28x28 navy circle with a white
 * digit. Implemented as a real `<table bgcolor="">` so Outlook (which
 * ignores `border-radius` and `background-color`) still paints the
 * navy square. Modern clients see a navy circle.
 */
const StepBadge: React.FC<{ digit: string }> = ({ digit }) => (
  <td
    width={28}
    height={28}
    align="center"
    valign="middle"
    {...bgcolorProps(COLORS.primary)}
    className="agq-badge agq-text-light"
    style={{
      width: 28,
      height: 28,
      backgroundColor: COLORS.primary,
      color: "#ffffff",
      borderRadius: 14,
      fontFamily: FONT_BODY,
      fontWeight: 700,
      fontSize: 14,
      lineHeight: "28px",
      msoLineHeightRule: "exactly",
      textAlign: "center",
    } as React.CSSProperties}
  >
    {digit}
  </td>
);

const StepHeaderRow: React.FC<{ digit: string; title: string }> = ({
  digit,
  title,
}) => (
  <table
    role="presentation"
    cellPadding={0}
    cellSpacing={0}
    border={0}
    style={{ borderCollapse: "collapse" }}
  >
    <tbody>
      <tr>
        <StepBadge digit={digit} />
        <td
          width={12}
          style={{ width: 12, lineHeight: "1px", fontSize: 1 }}
        >
          &nbsp;
        </td>
        <td valign="middle" className="agq-text-dark" style={styles.stepTitle}>
          {title}
        </td>
      </tr>
    </tbody>
  </table>
);

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
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
        <style dangerouslySetInnerHTML={{ __html: HEAD_CSS }} />
      </Head>
      <Preview>
        Your AGQ Investment Management App invitation and Client ID are inside.
      </Preview>
      <Body style={styles.body} {...bgcolorProps(COLORS.pageBg)}>
        <Container style={styles.container}>
          {/* HEADER */}
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            border={0}
            style={{ borderCollapse: "collapse" }}
          >
            <tbody>
              <tr>
                <td
                  align="center"
                  {...bgcolorProps(COLORS.primary)}
                  className="agq-header"
                  style={{
                    backgroundColor: COLORS.primary,
                    backgroundImage: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                    padding: "36px 24px",
                    textAlign: "center",
                  }}
                >
                  <span
                    dangerouslySetInnerHTML={{ __html: HEADER_VML_OPEN }}
                  />
                  {/*
                    Logo is wrapped in its own centered table because some
                    email clients (notably Apple Mail and Gmail web) strip
                    `margin: 0 auto` from a `display: block` <img>, leaving
                    the image left-aligned inside the header. Wrapping it
                    in a `<table align="center">` is the bulletproof
                    centering pattern: the table itself is a block-level
                    element that gets horizontally centered by its parent's
                    `align="center"` / `text-align: center`, and the image
                    inside it stays its natural size. Works in every
                    client, including Outlook.
                  */}
                  <table
                    role="presentation"
                    align="center"
                    cellPadding={0}
                    cellSpacing={0}
                    border={0}
                    style={{
                      borderCollapse: "collapse",
                      margin: "0 auto",
                    }}
                  >
                    <tbody>
                      <tr>
                        <td align="center" style={{ textAlign: "center" }}>
                          <Img
                            src={`cid:${logoCid}`}
                            alt="AGQ"
                            width="160"
                            height="101"
                            style={{
                              display: "block",
                              width: 160,
                              height: 101,
                              maxWidth: 160,
                              border: 0,
                              outline: "none",
                              textDecoration: "none",
                            }}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <Heading
                    as="h1"
                    className="agq-text-light"
                    style={styles.headerTitle}
                  >
                    Welcome to your Investment
                    <br />
                    Management App Invitation
                  </Heading>
                  <span
                    dangerouslySetInnerHTML={{ __html: HEADER_VML_CLOSE }}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* GREETING + INTRO */}
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            border={0}
            style={{ borderCollapse: "collapse" }}
          >
            <tbody>
              <tr>
                <td style={styles.contentPadding}>
                  <Text className="agq-text-dark" style={styles.greeting}>
                    Dear {firstName},
                  </Text>
                  <Text className="agq-text-dark" style={styles.paragraph}>
                    We hope this message finds you well.
                  </Text>
                  <Text className="agq-text-dark" style={styles.paragraph}>
                    We&rsquo;re excited to get you set up on the AGQ
                    App&mdash;your personal, real-time view of your investment
                    portfolio, available anytime directly from your phone.
                  </Text>
                  <Text className="agq-text-dark" style={styles.paragraph}>
                    This is a quick, one-time setup that takes just a few
                    minutes. Follow the four steps below and you&rsquo;ll be
                    all set.
                  </Text>
                </td>
              </tr>
            </tbody>
          </table>

          {/* STEPS PANEL */}
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            border={0}
            style={{
              borderCollapse: "collapse",
              margin: "8px 0 8px 0",
            }}
          >
            <tbody>
              <tr>
                <td style={{ padding: "0 32px" }}>
                  <table
                    role="presentation"
                    width="100%"
                    cellPadding={0}
                    cellSpacing={0}
                    border={0}
                    {...bgcolorProps(COLORS.panelBg)}
                    style={{
                      borderCollapse: "collapse",
                      backgroundColor: COLORS.panelBg,
                      borderLeft: `4px solid ${COLORS.primary}`,
                      borderRadius: 8,
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          className="agq-panel"
                          {...bgcolorProps(COLORS.panelBg)}
                          style={{
                            backgroundColor: COLORS.panelBg,
                            padding: "24px",
                          }}
                        >
                          {/* STEP 1 - Download the AGQ App */}
                          <StepCard>
                            <StepHeaderRow
                              digit="1"
                              title="Download the AGQ App"
                            />
                            <Text
                              className="agq-text-dark"
                              style={styles.stepBodyText}
                            >
                              For Apple users click{" "}
                              <Link
                                href={iosLink}
                                className="agq-text-primary"
                                style={styles.inlineLink}
                              >
                                Here
                              </Link>
                            </Text>
                            <Text
                              className="agq-text-dark"
                              style={styles.stepBodyText}
                            >
                              For Android users click{" "}
                              <Link
                                href={androidLink}
                                className="agq-text-primary"
                                style={styles.inlineLink}
                              >
                                Here
                              </Link>
                            </Text>
                            <NoteBox>
                              <Text
                                className="agq-text-dark"
                                style={styles.noteText}
                              >
                                <strong
                                  className="agq-text-primary"
                                  style={{ color: COLORS.primary }}
                                >
                                  Important Note:
                                </strong>{" "}
                                The app is only available on mobile devices.
                                The download links must be opened on a mobile
                                device to install the app.
                              </Text>
                            </NoteBox>
                          </StepCard>

                          {/* STEP 2 - Create Your Account */}
                          <StepCard>
                            <StepHeaderRow
                              digit="2"
                              title="Create Your Account"
                            />
                            <Text
                              className="agq-text-dark"
                              style={styles.stepBodyText}
                            >
                              Once installed, open the app and tap{" "}
                              <strong>&ldquo;Create Account.&rdquo;</strong>{" "}
                              Enter your email address and choose a password.
                            </Text>
                          </StepCard>

                          {/* STEP 3 - Enter Your Client ID */}
                          <StepCard>
                            <StepHeaderRow
                              digit="3"
                              title="Enter Your Client ID (CID)"
                            />
                            <Text
                              className="agq-text-dark"
                              style={styles.stepBodyText}
                            >
                              When prompted, enter the Client ID
                              below&mdash;this links your account to your
                              portfolio.
                            </Text>
                            <table
                              role="presentation"
                              width="100%"
                              cellPadding={0}
                              cellSpacing={0}
                              border={0}
                              {...bgcolorProps(COLORS.cidBg)}
                              style={{
                                borderCollapse: "collapse",
                                backgroundColor: COLORS.cidBg,
                                border: `2px solid ${COLORS.primary}`,
                                borderRadius: 8,
                                margin: "14px 0 0 0",
                              }}
                            >
                              <tbody>
                                <tr>
                                  <td
                                    align="center"
                                    {...bgcolorProps(COLORS.cidBg)}
                                    className="agq-cid"
                                    style={{
                                      backgroundColor: COLORS.cidBg,
                                      padding: "18px",
                                      textAlign: "center",
                                    }}
                                  >
                                    <Text
                                      className="agq-text-primary"
                                      style={styles.cidLabel}
                                    >
                                      Your Client ID (CID)
                                    </Text>
                                    <Text
                                      className="agq-text-dark"
                                      style={styles.cidValue}
                                    >
                                      {clientCid}
                                    </Text>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <Text style={styles.cidNote}>
                              This is your unique 8-digit identifier. Please
                              keep it confidential.
                            </Text>
                          </StepCard>

                          {/* STEP 4 - Finish & Log In */}
                          <StepCard last>
                            <StepHeaderRow
                              digit="4"
                              title="Finish & Log In"
                            />
                            <Text
                              className="agq-text-dark"
                              style={styles.stepBodyText}
                            >
                              Follow the final prompts to complete setup. This
                              only needs to be done once.
                            </Text>
                            <Text
                              className="agq-text-dark"
                              style={styles.stepBodyText}
                            >
                              Going forward, open the app and log in with your
                              email and password anytime.
                            </Text>
                          </StepCard>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* SUPPORT PANEL */}
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            border={0}
            style={{ borderCollapse: "collapse" }}
          >
            <tbody>
              <tr>
                <td style={{ padding: "0 32px" }}>
                  <table
                    role="presentation"
                    width="100%"
                    cellPadding={0}
                    cellSpacing={0}
                    border={0}
                    {...bgcolorProps(COLORS.panelBg)}
                    style={{
                      borderCollapse: "collapse",
                      backgroundColor: COLORS.panelBg,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          align="center"
                          {...bgcolorProps(COLORS.panelBg)}
                          className="agq-panel"
                          style={{
                            backgroundColor: COLORS.panelBg,
                            padding: "20px",
                            textAlign: "center",
                          }}
                        >
                          <Text
                            className="agq-text-dark"
                            style={styles.supportContact}
                          >
                            Have a question or need help? Our support team is
                            happy to assist&mdash;email us anytime at{" "}
                            <Link
                              href={`mailto:${supportEmail}`}
                              className="agq-text-primary"
                              style={{
                                color: COLORS.primary,
                                fontWeight: 700,
                                textDecoration: "underline",
                              }}
                            >
                              {supportEmail}
                            </Link>
                            {" "}and we&rsquo;ll get back to you promptly.
                          </Text>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* CLOSING + SIGNATURE */}
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            border={0}
            style={{ borderCollapse: "collapse" }}
          >
            <tbody>
              <tr>
                <td style={styles.contentPadding}>
                  <Text className="agq-text-dark" style={styles.paragraph}>
                    Thank you for your continued trust in our team.
                  </Text>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "16px 32px 32px 32px" }}>
                  <table
                    role="presentation"
                    width="100%"
                    cellPadding={0}
                    cellSpacing={0}
                    border={0}
                    {...bgcolorProps(COLORS.panelBg)}
                    style={{
                      borderCollapse: "collapse",
                      backgroundColor: COLORS.panelBg,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          {...bgcolorProps(COLORS.panelBg)}
                          className="agq-panel"
                          style={{
                            backgroundColor: COLORS.panelBg,
                            padding: "18px 20px",
                          }}
                        >
                          <Text
                            className="agq-text-dark"
                            style={styles.signatureItalic}
                          >
                            With humility and continued gratitude,
                          </Text>
                          <Text
                            className="agq-text-dark"
                            style={styles.signatureName}
                          >
                            Sonny and Kash Shaikh
                          </Text>
                          <Text
                            className="agq-text-dark"
                            style={styles.signatureTeam}
                          >
                            AGQ Team
                          </Text>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* FOOTER */}
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            border={0}
            style={{ borderCollapse: "collapse" }}
          >
            <tbody>
              <tr>
                <td
                  align="center"
                  {...bgcolorProps(COLORS.primary)}
                  className="agq-footer"
                  style={{
                    backgroundColor: COLORS.primary,
                    backgroundImage: `linear-gradient(135deg, ${COLORS.primaryDark} 0%, ${COLORS.primary} 100%)`,
                    padding: "28px 24px",
                    textAlign: "center",
                  }}
                >
                  <span
                    dangerouslySetInnerHTML={{ __html: FOOTER_VML_OPEN }}
                  />
                  <Text
                    className="agq-text-light"
                    style={styles.footerTagline}
                  >
                    &ldquo;Planning Today, Securing Tomorrow&rdquo;
                  </Text>
                  <Text
                    className="agq-text-light"
                    style={styles.footerCompany}
                  >
                    AGQ Consulting LLC
                  </Text>
                  <Text
                    className="agq-text-light"
                    style={styles.footerLine}
                  >
                    195 International Parkway &nbsp;|&nbsp; Suite 103
                    &nbsp;|&nbsp; Lake Mary, FL 32746
                  </Text>
                  <Text
                    className="agq-text-light"
                    style={styles.footerLineLast}
                  >
                    Email:{" "}
                    <Link
                      href={`mailto:${supportEmail}`}
                      style={{
                        color: "#ffffff",
                        textDecoration: "underline",
                      }}
                    >
                      {supportEmail}
                    </Link>
                  </Text>
                  <span
                    dangerouslySetInnerHTML={{ __html: FOOTER_VML_CLOSE }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </Container>
      </Body>
    </Html>
  );
};

/**
 * White card used inside the steps panel. Uses raw <table bgcolor> so
 * that Outlook dark mode does not invert the card to navy.
 */
const StepCard: React.FC<{
  children: React.ReactNode;
  last?: boolean;
}> = ({ children, last }) => (
  <table
    role="presentation"
    width="100%"
    cellPadding={0}
    cellSpacing={0}
    border={0}
    {...bgcolorProps(COLORS.cardBg)}
    style={{
      borderCollapse: "collapse",
      backgroundColor: COLORS.cardBg,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 8,
      margin: last ? 0 : "0 0 16px 0",
    }}
  >
    <tbody>
      <tr>
        <td
          {...bgcolorProps(COLORS.cardBg)}
          className="agq-card"
          style={{
            backgroundColor: COLORS.cardBg,
            padding: "20px",
          }}
        >
          {children}
        </td>
      </tr>
    </tbody>
  </table>
);

/**
 * Soft yellow callout used inside Step 1 to draw the eye to the
 * "mobile-only" warning.
 */
const NoteBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <table
    role="presentation"
    width="100%"
    cellPadding={0}
    cellSpacing={0}
    border={0}
    {...bgcolorProps(COLORS.warningBg)}
    style={{
      borderCollapse: "collapse",
      backgroundColor: COLORS.warningBg,
      borderLeft: `4px solid ${COLORS.warningBorder}`,
      borderRadius: 6,
      margin: "14px 0 0 0",
    }}
  >
    <tbody>
      <tr>
        <td
          {...bgcolorProps(COLORS.warningBg)}
          className="agq-note"
          style={{
            backgroundColor: COLORS.warningBg,
            padding: "12px 14px",
          }}
        >
          {children}
        </td>
      </tr>
    </tbody>
  </table>
);

export default InviteEmail;
