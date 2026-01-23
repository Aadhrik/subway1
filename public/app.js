// NYC Subway Departure Board - Client App

const POLL_INTERVAL = 30000; // 30 seconds
const API_URL = '/api/arrivals';

// DOM Elements
const arrivalsB = document.getElementById('arrivals-b');
const arrivalsD = document.getElementById('arrivals-d');
const lastUpdate = document.getElementById('last-update');

// Store arrival data for real-time updates
let arrivalData = { B: [], D: [] };

// Format arrival time (e.g. 10:45 PM)
function formatClockTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}

// Safety buffer in minutes - subtract this from all arrival times
// Adjust this if times don't match your experience
const SAFETY_BUFFER_MINUTES = 2;
const SAFETY_BUFFER_SECONDS = SAFETY_BUFFER_MINUTES * 60;

// Apply safety buffer to timestamp
function getBufferedTimestamp(timestamp) {
    return timestamp - SAFETY_BUFFER_SECONDS;
}

// Check if a train's buffered time has passed (should be hidden)
function hasTrainPassed(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const bufferedTimestamp = getBufferedTimestamp(timestamp);
    return bufferedTimestamp < now;
}

// Calculate minutes from now until timestamp (with buffer applied)
// Uses floor to be conservative - shows minimum time you have
function getMinutesUntil(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const bufferedTimestamp = getBufferedTimestamp(timestamp);
    const minutes = Math.floor((bufferedTimestamp - now) / 60);
    return Math.max(0, minutes);
}

// Format minutes into display text
function formatArrival(arrival) {
    const minutes = getMinutesUntil(arrival.timestamp);
    // Apply buffer to ETA clock time too for consistency
    const bufferedTimestamp = getBufferedTimestamp(arrival.timestamp);
    const timeStr = formatClockTime(bufferedTimestamp);

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

// Initialize track structure (only needs to be done once per fetch)
function initTrack(elementId) {
    const container = document.getElementById(elementId);
    const MAX_MINUTES = 20;
    
    // Generate tick marks for every minute
    let tickMarksHtml = '';
    for (let i = 0; i <= MAX_MINUTES; i++) {
        // Position: 0 min = 5% (left), 20 min = 95% (right)
        const percent = 5 + (i / MAX_MINUTES) * 90;
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

// Update train positions in real-time (called every second)
function updateTrainPositions(elementId, arrivals) {
    const container = document.getElementById(elementId);
    if (!container) return;

    // Remove existing train icons
    container.querySelectorAll('.train-icon').forEach(el => el.remove());

    // Filter out trains whose buffered time has passed
    const activeArrivals = arrivals ? arrivals.filter(a => !hasTrainPassed(a.timestamp)) : [];

    if (activeArrivals.length === 0) {
        container.classList.remove('track-arriving');
        return;
    }

    const MAX_MINUTES = 20;
    let hasArrivingTrain = false;

    activeArrivals.forEach(arrival => {
        // Calculate real-time minutes from timestamp
        const minutes = getMinutesUntil(arrival.timestamp);
        
        // Skip trains too far away
        if (minutes > MAX_MINUTES) return;

        if (minutes <= 1) hasArrivingTrain = true;

        // RIGHT to LEFT: 20 min = 95% (right), 0 min = 5% (left, at station)
        let percent = Math.max(5, Math.min(95, 5 + (minutes / MAX_MINUTES) * 90));
        if (minutes <= 0) percent = 5;

        // Determine distance class for styling
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

        // Create tooltip text
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

    // Update arriving class on container
    if (hasArrivingTrain) {
        container.classList.add('track-arriving');
    } else {
        container.classList.remove('track-arriving');
    }
}

// Render arrivals for a line (text display)
function renderArrivals(element, arrivals) {
    // Filter out trains whose buffered time has passed
    const activeArrivals = arrivals ? arrivals.filter(a => !hasTrainPassed(a.timestamp)) : [];
    
    if (activeArrivals.length === 0) {
        element.innerHTML = '<span class="no-service">No trains scheduled</span>';
        return;
    }

    element.innerHTML = activeArrivals.map(formatArrival).join('');
}

// Update all displays in real-time (called every second)
function updateRealTime() {
    // Update text displays
    renderArrivals(arrivalsB, arrivalData.B);
    renderArrivals(arrivalsD, arrivalData.D);

    // Update train positions on tracks
    updateTrainPositions('track-b', arrivalData.B);
    updateTrainPositions('track-d', arrivalData.D);
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

        // Store arrival data for real-time updates
        arrivalData = data.arrivals;

        // Initialize track structures
        initTrack('track-b');
        initTrack('track-d');

        // Initial render
        updateRealTime();

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
    // Initialize track structures
    initTrack('track-b');
    initTrack('track-d');

    // Initial fetch
    fetchArrivals();

    // Poll API every 30 seconds
    setInterval(fetchArrivals, POLL_INTERVAL);

    // Update displays every second for real-time movement
    setInterval(updateRealTime, 1000);

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
