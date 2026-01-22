// NYC Subway Departure Board - Client App

const POLL_INTERVAL = 30000; // 30 seconds
const API_URL = '/api/arrivals';

// DOM Elements
const arrivalsB = document.getElementById('arrivals-b');
const arrivalsD = document.getElementById('arrivals-d');
const lastUpdate = document.getElementById('last-update');

// Format minutes into display text
function formatArrival(minutes) {
    if (minutes <= 0) {
        return '<span class="arrival-time arriving">NOW</span>';
    } else if (minutes === 1) {
        return `<span class="arrival-time arriving">1<span class="unit">min</span></span>`;
    } else {
        return `<span class="arrival-time">${minutes}<span class="unit">min</span></span>`;
    }
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

        lastUpdate.textContent = `Updated ${formatTime(new Date())}`;

    } catch (error) {
        console.error('Error fetching arrivals:', error);

        arrivalsB.innerHTML = '<span class="no-service">Service unavailable</span>';
        arrivalsD.innerHTML = '<span class="no-service">Service unavailable</span>';
        lastUpdate.textContent = `Update failed at ${formatTime(new Date())}`;
    }
}

// Initialize
function init() {
    // Initial fetch
    fetchArrivals();

    // Poll every 30 seconds
    setInterval(fetchArrivals, POLL_INTERVAL);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
