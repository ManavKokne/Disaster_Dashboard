/**
 * Coordinate Jitter Utility
 *
 * Adds small random offsets to marker coordinates so that multiple markers
 * at the same city/location don't stack on top of each other.
 *
 * This module is intentionally isolated so it can be easily removed or
 * replaced once real per-tweet coordinates are available.
 *
 * Usage:
 *   import { jitterCoordinates } from "@/lib/coordinate-jitter";
 *   const jitteredTweets = jitterCoordinates(tweets);
 *
 * To disable jitter, simply replace the import with an identity function:
 *   const jitterCoordinates = (tweets) => tweets;
 */

// Maximum offset in degrees (~0.09° ≈ 10 km at Indian latitudes)
const DEFAULT_JITTER_RADIUS = 0.09;

/**
 * Deterministic pseudo-random based on tweet id.
 * Ensures the same tweet always gets the same offset so markers
 * don't jump around on re-renders.
 */
function seededRandom(seed) {
  // Simple hash from numeric/string id
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  // Convert to 0-1 range
  const x = Math.sin(h) * 10000;
  return x - Math.floor(x);
}

/**
 * Apply a small random offset to a single coordinate pair.
 * @param {{ lat: number, lng: number }} coords - Original coordinates
 * @param {string|number} id - Unique tweet identifier (used as seed)
 * @param {number} radius - Max jitter in degrees
 * @returns {{ lat: number, lng: number }} Jittered coordinates
 */
export function jitterCoordinate(coords, id, radius = DEFAULT_JITTER_RADIUS) {
  if (!coords) return coords;

  const r1 = seededRandom(id);
  const r2 = seededRandom(`${id}_lng`);

  // Offset in range [-radius, +radius]
  const latOffset = (r1 - 0.5) * 2 * radius;
  const lngOffset = (r2 - 0.5) * 2 * radius;

  return {
    lat: coords.lat + latOffset,
    lng: coords.lng + lngOffset,
  };
}

/**
 * Apply jitter to an array of tweets that have a `coordinates` property.
 * Returns new tweet objects with jittered coordinates (originals are not mutated).
 *
 * @param {Array} tweets - Array of tweet objects with { id, coordinates: { lat, lng }, ... }
 * @param {number} [radius] - Max jitter in degrees
 * @returns {Array} New array with jittered coordinates
 */
export function jitterCoordinates(tweets, radius = DEFAULT_JITTER_RADIUS) {
  return tweets.map((tweet) => {
    if (!tweet.coordinates) return tweet;
    return {
      ...tweet,
      _originalCoordinates: tweet.coordinates,
      coordinates: jitterCoordinate(tweet.coordinates, tweet.id, radius),
    };
  });
}
