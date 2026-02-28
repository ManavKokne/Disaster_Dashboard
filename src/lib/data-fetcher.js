/**
 * Data Fetcher Abstraction Layer
 * 
 * This module abstracts data access so the CSV source can be swapped
 * for BigQuery, PostgreSQL, or any other database without changing
 * the rest of the application.
 * 
 * To switch data sources, modify the implementation below.
 */

import fs from "fs";
import path from "path";
import Papa from "papaparse";

const CSV_DIR = path.join(process.cwd(), "public");

/**
 * Fetch all tweet data.
 * @returns {Promise<Array>} Array of tweet objects
 */
export async function fetchTweets() {
  const csvPath = path.join(CSV_DIR, "dummy_tweets_1000.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const { data } = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  // Add unique IDs to each row
  return data.map((row, index) => ({
    id: index + 1,
    tweet: row.tweet || "",
    location: row.location || "",
    request_type: row.request_type || "",
    urgency: (row.urgency || "").trim(),
  }));
}

/**
 * Fetch city coordinates cache.
 * @returns {Promise<Array>} Array of {city, latitude, longitude}
 */
export async function fetchCityCoordinates() {
  const csvPath = path.join(CSV_DIR, "india_city_coordinates.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const { data } = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  return data;
}
