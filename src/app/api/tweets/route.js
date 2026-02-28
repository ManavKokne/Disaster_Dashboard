import { NextResponse } from "next/server";
import { fetchTweets, fetchCityCoordinates } from "@/lib/data-fetcher";

export async function GET() {
  try {
    const [tweets, cities] = await Promise.all([
      fetchTweets(),
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
      cityCoordinates: cities,
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
