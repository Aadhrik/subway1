/**
 * Subway Departure Board Widget
 * Shows real-time train arrivals for NYC subway
 */
class SubwayWidget extends Widget {
    constructor(config = {}) {
        super({
            id: 'subway',
            title: config.title || 'Subway',
            size: config.size || 'large',
            refreshInterval: config.refreshInterval || 30000,
            ...config
        });

        // Configuration
        this.apiUrl = config.apiUrl || '/api/arrivals';
        this.safetyBufferMinutes = config.safetyBufferMinutes ?? 2;
        this.safetyBufferSeconds = this.safetyBufferMinutes * 60;
        this.maxMinutes = config.maxMinutes || 20;

        // State
        this.arrivalData = { B: [], D: [] };
        this.realtimeIntervalId = null;
    }

    // ==================== Time Helpers ====================

    getBufferedTimestamp(timestamp) {
        return timestamp - this.safetyBufferSeconds;
    }

    hasTrainPassed(timestamp) {
        const now = Math.floor(Date.now() / 1000);
        const bufferedTimestamp = this.getBufferedTimestamp(timestamp);
        return bufferedTimestamp < now;
    }

    getMinutesUntil(timestamp) {
        const now = Math.floor(Date.now() / 1000);
        const bufferedTimestamp = this.getBufferedTimestamp(timestamp);
        const minutes = Math.floor((bufferedTimestamp - now) / 60);
        return Math.max(0, minutes);
    }

    formatClockTime(timestamp) {
        return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // ==================== Rendering ====================

    render() {
        return `
            <div class="subway-board">
                <header class="subway-header">
                    <div class="header-top">
                        <h2 class="station-name">Grand St</h2>
                        <div class="header-time"></div>
                    </div>
                    <div class="header-bottom">
                        <div class="direction">Uptown & The Bronx</div>
                        <div class="header-date"></div>
                    </div>
                </header>

                <div class="subway-departures">
                    <div class="line-row" data-line="b">
                        <div class="line-header">
                            <div class="line-badge badge-b">B</div>
                            <div class="arrivals" data-arrivals="b">
                                <span class="loading">Loading...</span>
                            </div>
                        </div>
                        <div class="train-track-container" data-track="b">
                            <div class="track-line"></div>
                            <div class="station-marker"></div>
                        </div>
                    </div>

                    <div class="line-row" data-line="d">
                        <div class="line-header">
                            <div class="line-badge badge-d">D</div>
                            <div class="arrivals" data-arrivals="d">
                                <span class="loading">Loading...</span>
                            </div>
                        </div>
                        <div class="train-track-container" data-track="d">
                            <div class="track-line"></div>
                            <div class="station-marker"></div>
                        </div>
                    </div>
                </div>

                <footer class="subway-footer">
                    <span class="last-update"></span>
                </footer>
            </div>
        `;
    }

    afterRender() {
        // Initialize tracks
        this.initTrack('b');
        this.initTrack('d');

        // Start clock and real-time updates
        this.updateHeaderDateTime();
        this.clockIntervalId = setInterval(() => this.updateHeaderDateTime(), 1000);
        this.realtimeIntervalId = setInterval(() => this.updateRealTime(), 1000);

        // Initial data fetch
        this.refresh();
    }

    updateHeaderDateTime() {
        const now = new Date();
        
        const timeEl = this.$('.header-time');
        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        
        const dateEl = this.$('.header-date');
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    initTrack(line) {
        const container = this.$(`[data-track="${line}"]`);
        if (!container) return;

        // Generate tick marks for every minute
        let tickMarksHtml = '';
        for (let i = 0; i <= this.maxMinutes; i++) {
            const percent = 5 + (i / this.maxMinutes) * 90;
            const isMajor = i % 5 === 0;
            const label = i === 0 ? '' : (isMajor ? i : '');
            tickMarksHtml += `<span class="track-tick ${isMajor ? 'major' : 'minor'}" style="left: ${percent}%"><span class="tick-label">${label}</span></span>`;
        }

        container.innerHTML = `
            <div class="track-line"></div>
            <div class="station-marker"></div>
            <div class="track-ticks">${tickMarksHtml}</div>
        `;
    }

    formatArrival(arrival) {
        const minutes = this.getMinutesUntil(arrival.timestamp);
        const bufferedTimestamp = this.getBufferedTimestamp(arrival.timestamp);
        const timeStr = this.formatClockTime(bufferedTimestamp);

        let countdownHtml;
        if (minutes <= 0) {
            countdownHtml = '<span class="arrival-time arriving">NOW</span>';
        } else if (minutes === 1) {
            countdownHtml = `<span class="arrival-time arriving">1<span class="unit">min</span></span>`;
        } else {
            countdownHtml = `<span class="arrival-time">${minutes}<span class="unit">min</span></span>`;
        }

        return `
            <div class="arrival-item">
                ${countdownHtml}
                <span class="arrival-clock">${timeStr}</span>
            </div>
        `;
    }

    renderArrivals(line) {
        const element = this.$(`[data-arrivals="${line}"]`);
        if (!element) return;

        const arrivals = this.arrivalData[line.toUpperCase()] || [];
        const activeArrivals = arrivals.filter(a => !this.hasTrainPassed(a.timestamp));

        if (activeArrivals.length === 0) {
            element.innerHTML = '<span class="no-service">No trains scheduled</span>';
            return;
        }

        element.innerHTML = activeArrivals.map(a => this.formatArrival(a)).join('');
    }

    updateTrainPositions(line) {
        const container = this.$(`[data-track="${line}"]`);
        if (!container) return;

        // Remove existing train icons
        container.querySelectorAll('.train-icon').forEach(el => el.remove());

        const arrivals = this.arrivalData[line.toUpperCase()] || [];
        const activeArrivals = arrivals.filter(a => !this.hasTrainPassed(a.timestamp));

        if (activeArrivals.length === 0) {
            container.classList.remove('track-arriving');
            return;
        }

        let hasArrivingTrain = false;

        activeArrivals.forEach(arrival => {
            const minutes = this.getMinutesUntil(arrival.timestamp);
            if (minutes > this.maxMinutes) return;

            if (minutes <= 1) hasArrivingTrain = true;

            // RIGHT to LEFT: 20 min = 95% (right), 0 min = 5% (left, at station)
            let percent = Math.max(5, Math.min(95, 5 + (minutes / this.maxMinutes) * 90));
            if (minutes <= 0) percent = 5;

            let distanceClass = '';
            if (minutes <= 1) {
                distanceClass = 'arriving';
            } else if (minutes <= 5) {
                distanceClass = 'close';
            } else if (minutes <= 10) {
                distanceClass = 'mid-distance';
            } else {
                distanceClass = 'distant';
            }

            let tooltipText;
            if (minutes <= 0) {
                tooltipText = 'NOW';
            } else if (minutes === 1) {
                tooltipText = '1 min';
            } else {
                tooltipText = `${minutes}`;
            }

            const trainIcon = document.createElement('div');
            trainIcon.className = `train-icon ${distanceClass}`;
            trainIcon.style.left = `${percent}%`;
            trainIcon.innerHTML = `
                <div class="train-tooltip">${tooltipText}</div>
                <div class="train-body"></div>
            `;

            container.appendChild(trainIcon);
        });

        if (hasArrivingTrain) {
            container.classList.add('track-arriving');
        } else {
            container.classList.remove('track-arriving');
        }
    }

    updateRealTime() {
        this.renderArrivals('b');
        this.renderArrivals('d');
        this.updateTrainPositions('b');
        this.updateTrainPositions('d');
    }

    // ==================== Data Fetching ====================

    async refresh() {
        try {
            const response = await fetch(this.apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();
            this.arrivalData = data.arrivals;

            // Re-init tracks and update display
            this.initTrack('b');
            this.initTrack('d');
            this.updateRealTime();

            const lastUpdate = this.$('.last-update');
            if (lastUpdate) {
                lastUpdate.textContent = `Updated ${this.formatTime(new Date())}`;
            }

        } catch (error) {
            console.error('Error fetching subway data:', error);
            
            const arrivalsB = this.$('[data-arrivals="b"]');
            const arrivalsD = this.$('[data-arrivals="d"]');
            if (arrivalsB) arrivalsB.innerHTML = '<span class="no-service">Service unavailable</span>';
            if (arrivalsD) arrivalsD.innerHTML = '<span class="no-service">Service unavailable</span>';

            const lastUpdate = this.$('.last-update');
            if (lastUpdate) {
                lastUpdate.textContent = `Update failed at ${this.formatTime(new Date())}`;
            }
        }
    }

    // ==================== Cleanup ====================

    destroy() {
        super.destroy();
        if (this.realtimeIntervalId) {
            clearInterval(this.realtimeIntervalId);
        }
        if (this.clockIntervalId) {
            clearInterval(this.clockIntervalId);
        }
    }
}

// Register the widget
window.SubwayWidget = SubwayWidget;

