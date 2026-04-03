import twilio from "twilio";
import { getUrgencyMeta } from "./urgency";

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseRecipients(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

function isVoiceEnabled() {
  return String(process.env.TWILIO_VOICE_ENABLED ?? "true").toLowerCase() === "true";
}

function isSmsEnabled() {
  return String(process.env.TWILIO_SMS_ENABLED ?? "true").toLowerCase() === "true";
}

export async function sendTwilioAlert(type, tweetData) {
  const urgencyMeta = getUrgencyMeta(tweetData);

  if (type !== "urgent") {
    return { success: true, skipped: true, message: "Twilio only sends urgent alerts" };
  }

  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!client || !fromNumber) {
    return { success: false, message: "Twilio not configured" };
  }

  const voiceEnabled = isVoiceEnabled();
  const smsEnabled = isSmsEnabled();

  if (!voiceEnabled && !smsEnabled) {
    return {
      success: true,
      skipped: true,
      voiceEnabled,
      smsEnabled,
      message: "Twilio channels disabled by environment",
    };
  }

  const smsRecipients = smsEnabled ? parseRecipients(process.env.TWILIO_SMS_TO) : [];
  const callRecipients = voiceEnabled ? parseRecipients(process.env.TWILIO_CALL_TO) : [];

  if (smsRecipients.length === 0 && callRecipients.length === 0) {
    return { success: false, message: "No Twilio recipients configured" };
  }

  const alertText = `URGENT disaster alert at ${tweetData.location}. \nType: ${tweetData.request_type}. \nUrgency: ${urgencyMeta.label} (score ${urgencyMeta.score.toFixed(2)}). \n${tweetData.tweet}`;
  const voiceMessage =
    process.env.TWILIO_VOICE_MESSAGE ||
    `Urgent disaster alert detected at ${tweetData.location}. Urgency level is ${urgencyMeta.label}. Please check the dashboard immediately.`;
  const escapedVoiceMessage = escapeXml(voiceMessage);
  const voiceLanguage = process.env.TWILIO_VOICE_LANGUAGE || "en-US";
  const voiceName = process.env.TWILIO_VOICE_NAME || "alice";
  const loopCount = Number(process.env.TWILIO_VOICE_REPEAT || "2");
  const safeLoopCount = Number.isFinite(loopCount) && loopCount > 0 ? Math.min(loopCount, 5) : 2;

  const smsResults = smsEnabled
    ? await Promise.allSettled(
        smsRecipients.map((to) =>
          client.messages.create({
            from: fromNumber,
            to,
            body: alertText,
          })
        )
      )
    : [];

  const callResults = voiceEnabled
    ? await Promise.allSettled(
        callRecipients.map((to) =>
          client.calls.create({
            from: fromNumber,
            to,
            twiml: `<Response><Say voice="${voiceName}" language="${voiceLanguage}" loop="${safeLoopCount}">${escapedVoiceMessage}</Say></Response>`,
          })
        )
      )
    : [];

  return {
    success: true,
    voiceEnabled,
    smsEnabled,
    sms: smsResults.map((result) => (result.status === "fulfilled" ? { success: true } : { success: false, error: result.reason?.message || "SMS failed" })),
    calls: callResults.map((result) => (result.status === "fulfilled" ? { success: true } : { success: false, error: result.reason?.message || "Call failed" })),
  };
}
