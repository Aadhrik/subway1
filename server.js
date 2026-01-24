const express = require('express');
const cors = require('cors');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

const app = express();
const PORT = 8080;

// MTA feed URL for B/D/F/M trains
const MTA_FEED_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm';

// Grand St northbound stop ID
const STOP_ID = 'D21N';

// Lines we care about
const TARGET_LINES = ['B', 'D'];

app.use(cors());
app.use(express.static('public'));

// Parse route_id to get line letter (e.g., "B" from "B..N" or just "B")
function getLineLetter(routeId) {
    if (!routeId) return null;
    return routeId.charAt(0).toUpperCase();
}

app.get('/api/arrivals', async (req, res) => {
    try {
        const response = await fetch(MTA_FEED_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SubwayBoard/1.0)',
                'Accept': 'application/x-protobuf, application/octet-stream, */*'
            }
        });

        if (!response.ok) {
            throw new Error(`MTA API responded with status: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
            new Uint8Array(buffer)
        );

        const now = Math.floor(Date.now() / 1000);
        const arrivals = { B: [], D: [] };

        for (const entity of feed.entity) {
            if (!entity.tripUpdate) continue;

            const routeId = entity.tripUpdate.trip?.routeId;
            const line = getLineLetter(routeId);

            if (!TARGET_LINES.includes(line)) continue;

            const stopTimeUpdates = entity.tripUpdate.stopTimeUpdate || [];

            for (const stopTime of stopTimeUpdates) {
                if (stopTime.stopId === STOP_ID) {
                    // Get arrival time (prefer arrival, fall back to departure)
                    const arrivalTime = stopTime.arrival?.time?.low ||
                        stopTime.arrival?.time ||
                        stopTime.departure?.time?.low ||
                        stopTime.departure?.time;

                    if (arrivalTime && arrivalTime > now) {
                        // Use floor to be conservative - show minimum time you have
                        const minutesAway = Math.floor((arrivalTime - now) / 60);
                        arrivals[line].push({
                            minutes: minutesAway,
                            timestamp: arrivalTime
                        });
                    }
                }
            }
        }

        // Sort by time and take first 3 for each line
        for (const line of TARGET_LINES) {
            arrivals[line].sort((a, b) => a.timestamp - b.timestamp);
            arrivals[line] = arrivals[line].slice(0, 3);
        }

        res.json({
            station: 'Grand St',
            stopId: STOP_ID,
            timestamp: now,
            arrivals
        });

    } catch (error) {
        console.error('Error fetching MTA data:', error);
        res.status(500).json({
            error: 'Failed to fetch train data',
            message: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Subway board server running at http://localhost:${PORT}`);
});
