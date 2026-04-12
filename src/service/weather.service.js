const axios = require('axios');
const NodeCache = require('node-cache');

// Cache weather data for 1 hour to avoid hitting OpenWeatherMap rate limits
const weatherCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/3.0/onecall';
    // Sri Lanka default centre coordinates as fallback
    this.defaultLat = 7.8731;
    this.defaultLon = 80.7718;
  }

  /**
   * Fetch 7-day weather forecast for given coordinates
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Array} Formatted 7-day forecast array
   */
  async getForecast(lat, lon) {
    // Use provided coordinates or fall back to Sri Lanka centre
    const latitude = lat || this.defaultLat;
    const longitude = lon || this.defaultLon;

    const cacheKey = `weather_${latitude.toFixed(3)}_${longitude.toFixed(3)}`;

    // Return cached data if available
    const cached = weatherCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // If no API key configured, return synthetic weather data for development
    if (!this.apiKey || this.apiKey === 'your_key_here') {
      const syntheticData = this._generateSyntheticForecast();
      weatherCache.set(cacheKey, syntheticData);
      return syntheticData;
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: this.apiKey,
          units: 'metric',
          exclude: 'current,minutely,hourly,alerts',
        },
        timeout: 10000,
      });

      const formatted = this.formatForML(response.data.daily);
      weatherCache.set(cacheKey, formatted);
      return formatted;
    } catch (error) {
      // If API call fails, return synthetic data so the heatmap still works
      console.error(
        '[WeatherService] OpenWeatherMap API error:',
        error.message
      );
      const syntheticData = this._generateSyntheticForecast();
      weatherCache.set(cacheKey, syntheticData);
      return syntheticData;
    }
  }

  /**
   * Format raw OpenWeatherMap daily forecast into ML-ready structure
   * @param {Array} dailyData - Raw daily forecast from OWM API
   * @returns {Array} Formatted array of 7 daily weather objects
   */
  formatForML(dailyData) {
    return dailyData.slice(0, 7).map((day) => ({
      date: new Date(day.dt * 1000).toISOString().split('T')[0],
      temp: day.temp?.day || 28,
      humidity: day.humidity || 75,
      windSpeed: day.wind_speed || 4,
      // pop = probability of precipitation (0-1), convert to mm estimate
      precipitation: (day.pop || 0) * 20,
      uvIndex: day.uvi || 5,
      clouds: day.clouds || 50,
      // Weather condition code — mapped to readable label
      condition: this._mapWeatherCondition(day.weather?.[0]?.id),
    }));
  }

  /**
   * Map OpenWeatherMap condition codes to ML-readable labels
   * @param {number} conditionId - OWM weather condition ID
   * @returns {string} Weather category
   */
  _mapWeatherCondition(conditionId) {
    if (!conditionId) return 'clear';
    if (conditionId >= 200 && conditionId < 300) return 'thunderstorm';
    if (conditionId >= 300 && conditionId < 400) return 'drizzle';
    if (conditionId >= 500 && conditionId < 600) return 'rain';
    if (conditionId >= 600 && conditionId < 700) return 'snow';
    if (conditionId >= 700 && conditionId < 800) return 'fog';
    if (conditionId === 800) return 'clear';
    if (conditionId > 800) return 'cloudy';
    return 'clear';
  }

  /**
   * Generate synthetic 7-day forecast for development/fallback mode
   * Uses typical Sri Lanka coastal weather patterns
   * @returns {Array} 7-day synthetic weather forecast
   */
  _generateSyntheticForecast() {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      return {
        date: date.toISOString().split('T')[0],
        temp: 27 + Math.random() * 5, // 27-32°C (typical Sri Lanka coastal)
        humidity: 70 + Math.random() * 20, // 70-90%
        windSpeed: 3 + Math.random() * 6, // 3-9 m/s
        precipitation: Math.random() * 15, // 0-15 mm
        uvIndex: 8 + Math.random() * 3, // 8-11 (high UV in Sri Lanka)
        clouds: 20 + Math.random() * 60, // 20-80%
        condition: 'clear',
      };
    });
  }

  /**
   * Invalidate cached forecast for given coordinates
   * @param {number} lat
   * @param {number} lon
   */
  invalidateCache(lat, lon) {
    const cacheKey = `weather_${parseFloat(lat).toFixed(3)}_${parseFloat(lon).toFixed(3)}`;
    weatherCache.del(cacheKey);
  }

  /**
   * Get cache statistics for monitoring
   * @returns {object} Cache stats
   */
  getCacheStats() {
    return weatherCache.getStats();
  }
}

module.exports = new WeatherService();
