import { NextResponse } from "next/server";
import {
  fetchTweets,
  fetchCityCoordinates,
  updateTweetStatus,
  autoCloseResolvedTweets,
} from "@/lib/data-fetcher";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since") || undefined;

    await autoCloseResolvedTweets();

    const [tweets, cities] = await Promise.all([
      fetchTweets({ since }),
      fetchCityCoordinates(),
    ]);

    // Build a coordinate lookup map from city coordinates
    const coordMap = {};
    cities.forEach((c) => {
      coordMap[c.city.trim().toLowerCase()] = {
        lat: parseFloat(c.latitude),
        lng: parseFloat(c.longitude),
      };
    });

    // Attach coordinates to each tweet
    const tweetsWithCoords = tweets.map((tweet) => {
      const locKey = tweet.location.trim().toLowerCase();
      const coords = coordMap[locKey] || null;
      return {
        ...tweet,
        coordinates: coords,
      };
    });

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

    if (!id || !["resolve", "close"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid payload. Required: id and action(resolve|close)" },
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
