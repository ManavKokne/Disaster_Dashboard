import { NextResponse } from "next/server";
import { sendAlertEmail } from "@/lib/mailer";
import { sendTwilioAlert } from "@/lib/twilio";

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, tweetData } = body;

    if (!type || !tweetData) {
      return NextResponse.json(
        { error: "Missing required fields: type, tweetData" },
        { status: 400 }
      );
    }

    if (!["urgent", "resolved", "closed"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid alert type. Must be: urgent, resolved, or closed" },
        { status: 400 }
      );
    }

    const [emailResult, twilioResult] = await Promise.allSettled([
      sendAlertEmail(type, tweetData),
      sendTwilioAlert(type, tweetData),
    ]);

    return NextResponse.json({
      success: true,
      email:
        emailResult.status === "fulfilled"
          ? emailResult.value
          : { success: false, message: emailResult.reason?.message || "Email failed" },
      twilio:
        twilioResult.status === "fulfilled"
          ? twilioResult.value
          : { success: false, message: twilioResult.reason?.message || "Twilio failed" },
    });
  } catch (error) {
    console.error("Error sending alert:", error);
    return NextResponse.json(
      { error: "Failed to send alert email" },
      { status: 500 }
    );
  }
}
