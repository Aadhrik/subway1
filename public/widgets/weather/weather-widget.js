/**
 * Weather Widget
 * Clean, modern weather display inspired by Apple Weather
 * Uses Open-Meteo API (free, no API key required)
 */
class WeatherWidget extends Widget {
    constructor(config = {}) {
        super({
            id: 'weather',
            title: config.title || 'Weather',
            size: config.size || 'medium',
            refreshInterval: config.refreshInterval || 600000, // 10 minutes
            ...config
        });

        // Location (default: NYC)
        this.latitude = config.latitude || 40.7128;
        this.longitude = config.longitude || -74.0060;
        this.locationName = config.locationName || 'New York';
        
        // State
        this.weatherData = null;
    }

    // Weather code to condition mapping
    getWeatherCondition(code) {
        const conditions = {
            0: { label: 'Clear', icon: '☀️', gradient: 'clear' },
            1: { label: 'Mainly Clear', icon: '🌤', gradient: 'clear' },
            2: { label: 'Partly Cloudy', icon: '⛅', gradient: 'cloudy' },
            3: { label: 'Overcast', icon: '☁️', gradient: 'overcast' },
            45: { label: 'Foggy', icon: '🌫', gradient: 'fog' },
            48: { label: 'Icy Fog', icon: '🌫', gradient: 'fog' },
            51: { label: 'Light Drizzle', icon: '🌧', gradient: 'rain' },
            53: { label: 'Drizzle', icon: '🌧', gradient: 'rain' },
            55: { label: 'Heavy Drizzle', icon: '🌧', gradient: 'rain' },
            61: { label: 'Light Rain', icon: '🌧', gradient: 'rain' },
            63: { label: 'Rain', icon: '🌧', gradient: 'rain' },
            65: { label: 'Heavy Rain', icon: '🌧', gradient: 'storm' },
            66: { label: 'Freezing Rain', icon: '🌨', gradient: 'snow' },
            67: { label: 'Heavy Freezing Rain', icon: '🌨', gradient: 'snow' },
            71: { label: 'Light Snow', icon: '🌨', gradient: 'snow' },
            73: { label: 'Snow', icon: '❄️', gradient: 'snow' },
            75: { label: 'Heavy Snow', icon: '❄️', gradient: 'snow' },
            77: { label: 'Snow Grains', icon: '🌨', gradient: 'snow' },
            80: { label: 'Light Showers', icon: '🌦', gradient: 'rain' },
            81: { label: 'Showers', icon: '🌦', gradient: 'rain' },
            82: { label: 'Heavy Showers', icon: '⛈', gradient: 'storm' },
            85: { label: 'Snow Showers', icon: '🌨', gradient: 'snow' },
            86: { label: 'Heavy Snow Showers', icon: '🌨', gradient: 'snow' },
            95: { label: 'Thunderstorm', icon: '⛈', gradient: 'storm' },
            96: { label: 'Thunderstorm w/ Hail', icon: '⛈', gradient: 'storm' },
            99: { label: 'Severe Thunderstorm', icon: '⛈', gradient: 'storm' },
        };
        return conditions[code] || { label: 'Unknown', icon: '🌡', gradient: 'default' };
    }

    // Check if it's nighttime
    isNight() {
        // Prefer sunrise/sunset from API when available (more accurate than fixed hours)
        try {
            const daily = this.weatherData?.daily;
            const sunriseStr = daily?.sunrise?.[0];
            const sunsetStr = daily?.sunset?.[0];
            if (sunriseStr && sunsetStr) {
                const now = new Date();
                const sunrise = new Date(sunriseStr);
                const sunset = new Date(sunsetStr);
                return now < sunrise || now > sunset;
            }
        } catch {
            // fall back below
        }

        const hour = new Date().getHours();
        return hour < 6 || hour >= 20;
    }

    formatTimeOnly(dateLike) {
        const d = new Date(dateLike);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    render() {
        return `
            <div class="weather-widget">
                <div class="weather-loading">
                    <div class="weather-spinner"></div>
                </div>
            </div>
        `;
    }

    renderWeather() {
        if (!this.weatherData) return;

        const current = this.weatherData.current;
        const daily = this.weatherData.daily;
        const condition = this.getWeatherCondition(current.weather_code);
        const isNight = this.isNight();

        const sunrise = daily?.sunrise?.[0];
        const sunset = daily?.sunset?.[0];
        
        const widget = this.$('.weather-widget');
        widget.className = `weather-widget gradient-${condition.gradient}${isNight ? ' night' : ''}`;
        
        widget.innerHTML = `
            <div class="weather-content">
                <div class="weather-main">
                    <div class="weather-location">${this.locationName}</div>
                    <div class="weather-temp">${Math.round(current.temperature_2m)}°</div>
                    <div class="weather-condition">${condition.label}</div>
                    <div class="weather-range">
                        H:${Math.round(daily.temperature_2m_max[0])}° L:${Math.round(daily.temperature_2m_min[0])}°
                    </div>
                </div>
                
                <div class="weather-details">
                    <div class="weather-detail">
                        <span class="detail-label">Feels Like</span>
                        <span class="detail-value">${Math.round(current.apparent_temperature)}°</span>
                    </div>
                    <div class="weather-detail">
                        <span class="detail-label">Humidity</span>
                        <span class="detail-value">${current.relative_humidity_2m}%</span>
                    </div>
                    <div class="weather-detail">
                        <span class="detail-label">Wind</span>
                        <span class="detail-value">${Math.round(current.wind_speed_10m)} mph</span>
                    </div>
                    <div class="weather-detail">
                        <span class="detail-label">UV Index</span>
                        <span class="detail-value">${daily.uv_index_max[0].toFixed(1)}</span>
                    </div>
                    <div class="weather-detail">
                        <span class="detail-label">Sunrise</span>
                        <span class="detail-value">${sunrise ? this.formatTimeOnly(sunrise) : '—'}</span>
                    </div>
                    <div class="weather-detail">
                        <span class="detail-label">Sunset</span>
                        <span class="detail-value">${sunset ? this.formatTimeOnly(sunset) : '—'}</span>
                    </div>
                </div>

                <div class="weather-forecast">
                    ${this.renderForecast(daily)}
                </div>
            </div>
        `;
    }

    renderForecast(daily) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let html = '';
        
        // Show next 5 days
        for (let i = 1; i <= 5; i++) {
            const date = new Date(daily.time[i]);
            const dayName = days[date.getDay()];
            const condition = this.getWeatherCondition(daily.weather_code[i]);
            const high = Math.round(daily.temperature_2m_max[i]);
            const low = Math.round(daily.temperature_2m_min[i]);
            
            html += `
                <div class="forecast-day">
                    <span class="forecast-name">${dayName}</span>
                    <span class="forecast-icon">${condition.icon}</span>
                    <div class="forecast-temps">
                        <span class="forecast-high">${high}°</span>
                        <span class="forecast-low">${low}°</span>
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    afterRender() {
        this.refresh();
    }

    async refresh() {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.latitude}&longitude=${this.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Weather fetch failed');
            
            this.weatherData = await response.json();
            this.renderWeather();
            
        } catch (error) {
            console.error('Weather error:', error);
            this.$('.weather-widget').innerHTML = `
                <div class="weather-error">
                    <span>Unable to load weather</span>
                </div>
            `;
        }
    }
}

window.WeatherWidget = WeatherWidget;

