// NYC Subway Departure Board - Client App

const POLL_INTERVAL = 30000; // 30 seconds
const API_URL = '/api/arrivals';

// DOM Elements
const arrivalsB = document.getElementById('arrivals-b');
const arrivalsD = document.getElementById('arrivals-d');
const lastUpdate = document.getElementById('last-update');

// Format arrival time (e.g. 10:45 PM)
function formatClockTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}

// Format minutes into display text
function formatArrival(arrival) {
    const { minutes, timestamp } = arrival;
    const timeStr = formatClockTime(timestamp);

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

// Render train icons on track
function renderTrack(elementId, arrivals, lineLetter) {
    const container = document.getElementById(elementId);
    // Keep the static track elements
    container.innerHTML = `
    <div class="track-line"></div>
    <div class="station-marker"></div>
  `;

    if (!arrivals) return;

    // Max minutes to show on track (e.g. 20 mins away is start of track)
    const MAX_MINUTES = 20;

    arrivals.forEach(arrival => {
        const minutes = arrival.minutes;
        if (minutes > MAX_MINUTES) return;

        // Calculate percentage (0 min = 100% right, 20 min = 0% left)
        // We want 0 min to be at the station marker (right side)
        let percent = Math.max(0, Math.min(100, 100 - (minutes / MAX_MINUTES * 100)));

        // If arriving now, pulse at the station
        if (minutes <= 0) percent = 100;

        const trainIcon = document.createElement('div');
        trainIcon.className = `train-icon ${minutes <= 0 ? 'arriving' : ''}`;
        trainIcon.style.left = `${percent}%`;
        trainIcon.innerHTML = `
      <div class="train-body">${lineLetter}</div>
      <div class="train-tooltip">${minutes <= 0 ? 'Now' : minutes + 'm'}</div>
    `;

        container.appendChild(trainIcon);
    });
}

// Render arrivals for a line
function renderArrivals(element, arrivals) {
    if (!arrivals || arrivals.length === 0) {
        element.innerHTML = '<span class="no-service">No trains scheduled</span>';
        return;
    }

    element.innerHTML = arrivals.map(formatArrival).join('');
}

// Format timestamp for display
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Fetch and update arrivals
async function fetchArrivals() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        renderArrivals(arrivalsB, data.arrivals.B);
        renderArrivals(arrivalsD, data.arrivals.D);

        renderTrack('track-b', data.arrivals.B, 'B');
        renderTrack('track-d', data.arrivals.D, 'D');

        lastUpdate.textContent = `Updated ${formatTime(new Date())}`;

    } catch (error) {
        console.error('Error fetching arrivals:', error);

        arrivalsB.innerHTML = '<span class="no-service">Service unavailable</span>';
        arrivalsD.innerHTML = '<span class="no-service">Service unavailable</span>';
        lastUpdate.textContent = `Update failed at ${formatTime(new Date())}`;
    }
}

// Update current time display
function updateCurrentTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('current-time').textContent = timeStr;
}

// Initialize
function init() {
    // Initial fetch
    fetchArrivals();

    // Poll every 30 seconds
    setInterval(fetchArrivals, POLL_INTERVAL);

    // Update clock every second
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
