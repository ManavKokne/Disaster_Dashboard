/**
 * Geocode utility using local city coordinates cache.
 * Falls back to Google Maps Geocoder API if city not found in cache.
 */

// Local coordinate cache - loaded from india_city_coordinates.csv
let coordinateCache = new Map();

/**
 * Initialize the coordinate cache from parsed CSV data.
 * @param {Array<{city: string, latitude: string, longitude: string}>} cities
 */
export function initCoordinateCache(cities) {
  coordinateCache = new Map();
  cities.forEach((city) => {
    const key = city.city.trim().toLowerCase();
    coordinateCache.set(key, {
      lat: parseFloat(city.latitude),
      lng: parseFloat(city.longitude),
    });
  });
}

/**
 * Get coordinates for a location string.
 * Checks local cache first, then falls back to Geocoder.
 * @param {string} location - Place name
 * @param {google.maps.Geocoder} [geocoder] - Optional Google Maps Geocoder instance
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function getCoordinates(location, geocoder) {
  if (!location) return null;

  const key = location.trim().toLowerCase();

  // Check local cache first
  if (coordinateCache.has(key)) {
    return coordinateCache.get(key);
  }

  // Try partial matching (e.g., "New Delhi" matches "delhi")
  for (const [cachedKey, coords] of coordinateCache.entries()) {
    if (key.includes(cachedKey) || cachedKey.includes(key)) {
      // Cache the alias too
      coordinateCache.set(key, coords);
      return coords;
    }
  }

  // Fallback to Google Maps Geocoder
  if (geocoder) {
    try {
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode(
          { address: `${location}, India` },
          (results, status) => {
            if (status === "OK" && results[0]) {
              resolve({
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng(),
              });
            } else {
              reject(new Error(`Geocoding failed for ${location}: ${status}`));
            }
          }
        );
      });
      // Cache the result
      coordinateCache.set(key, result);
      return result;
    } catch (err) {
      console.warn(err.message);
      return null;
    }
  }

  return null;
}

/**
 * Get all cached coordinates.
 * @returns {Map<string, {lat: number, lng: number}>}
 */
export function getCache() {
  return coordinateCache;
}
