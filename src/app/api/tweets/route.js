import { NextResponse } from "next/server";
import {
  fetchTweets,
  updateTweetStatus,
  autoCloseResolvedTweets,
} from "@/lib/data-fetcher";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since") || undefined;

    await autoCloseResolvedTweets();

    const tweets = await fetchTweets({ since });

    const tweetsWithCoords = tweets.map((tweet) => ({
      ...tweet,
      coordinates:
        Number.isFinite(tweet.latitude) && Number.isFinite(tweet.longitude)
          ? { lat: tweet.latitude, lng: tweet.longitude }
          : null,
    }));

    return NextResponse.json({
      tweets: tweetsWithCoords,
      total: tweetsWithCoords.length,
    });
  } catch (error) {
    console.error("Error fetching tweets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tweets data" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const id = Number(body?.id);
    const action = body?.action;

    if (!id || !["resolve", "close", "acknowledge"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid payload. Required: id and action(resolve|close|acknowledge)" },
        { status: 400 }
      );
    }

    const result = await updateTweetStatus(id, action);
    if (!result.success) {
      return NextResponse.json(
        { error: result.message || "Failed to update tweet status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating tweet status:", error);
    return NextResponse.json(
      { error: "Failed to update tweet status" },
      { status: 500 }
    );
  }
}
