import { NextResponse } from "next/server";
import { sendAlertEmail } from "@/lib/mailer";

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

    const result = await sendAlertEmail(type, tweetData);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error sending alert:", error);
    return NextResponse.json(
      { error: "Failed to send alert email" },
      { status: 500 }
    );
  }
}
