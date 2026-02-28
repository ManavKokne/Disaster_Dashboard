import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an alert email for tweet status changes.
 * @param {"urgent"|"resolved"|"closed"} type - The alert type.
 * @param {object} tweetData - The tweet data to include in the email.
 */
export async function sendAlertEmail(type, tweetData) {
  const recipient = process.env.ALERT_RECIPIENT_EMAIL;
  if (!recipient || !process.env.SMTP_USER) {
    console.warn("SMTP not configured. Skipping email.");
    return { success: false, message: "SMTP not configured" };
  }

  const subjects = {
    urgent: `🚨 URGENT: New disaster post detected - ${tweetData.location}`,
    resolved: `✅ RESOLVED: Urgent post marked resolved - ${tweetData.location}`,
    closed: `🔒 CLOSED: Post removed from dashboard - ${tweetData.location}`,
  };

  const bodies = {
    urgent: `
      <h2 style="color: #dc2626;">⚠️ New Urgent Disaster Post Detected</h2>
      <table style="border-collapse:collapse; width:100%; max-width:600px;">
        <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Tweet</td><td style="padding:8px; border:1px solid #ddd;">${tweetData.tweet}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Location</td><td style="padding:8px; border:1px solid #ddd;">${tweetData.location}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Request Type</td><td style="padding:8px; border:1px solid #ddd;">${tweetData.request_type}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Urgency</td><td style="padding:8px; border:1px solid #ddd; color:#dc2626; font-weight:bold;">${tweetData.urgency}</td></tr>
      </table>
      <p>Please review this post on the dashboard immediately.</p>
    `,
    resolved: `
      <h2 style="color: #16a34a;">✅ Urgent Post Marked as Resolved</h2>
      <table style="border-collapse:collapse; width:100%; max-width:600px;">
        <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Tweet</td><td style="padding:8px; border:1px solid #ddd;">${tweetData.tweet}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Location</td><td style="padding:8px; border:1px solid #ddd;">${tweetData.location}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Request Type</td><td style="padding:8px; border:1px solid #ddd;">${tweetData.request_type}</td></tr>
      </table>
      <p>This post has been resolved by an operator.</p>
    `,
    closed: `
      <h2 style="color: #6b7280;">🔒 Post Closed / Removed</h2>
      <table style="border-collapse:collapse; width:100%; max-width:600px;">
        <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Tweet</td><td style="padding:8px; border:1px solid #ddd;">${tweetData.tweet}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Location</td><td style="padding:8px; border:1px solid #ddd;">${tweetData.location}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Request Type</td><td style="padding:8px; border:1px solid #ddd;">${tweetData.request_type}</td></tr>
      </table>
      <p>This post has been closed and removed from the dashboard view.</p>
    `,
  };

  try {
    await transporter.sendMail({
      from: `"Disaster Dashboard" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: subjects[type] || "Disaster Dashboard Alert",
      html: bodies[type] || "<p>Alert from Disaster Dashboard</p>",
    });
    return { success: true, message: `Alert email sent for type: ${type}` };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, message: error.message };
  }
}
