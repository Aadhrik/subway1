/**
 * Timepiece Widget
 * Elegant analog watch-style clock + date window
 * Mint dial, rose gold accents, sparkling diamond bezel
 */
class TimepieceWidget extends Widget {
    constructor(config = {}) {
        super({
            id: 'timepiece',
            title: config.title || 'Time',
            size: config.size || 'small',
            refreshInterval: 0,
            ...config
        });
        this._tickInterval = null;
    }

    render() {
        // Generate 24 diamonds for the bezel
        const diamonds = Array.from({ length: 24 }, (_, i) => {
            const angle = i * 15; // 360/24
            const delay = (i * 0.15) % 2; // Staggered sparkle animation
            return `<div class="tp-diamond" style="--angle: ${angle}deg; --sparkle-delay: ${delay}s"></div>`;
        }).join('');

        // Generate 12 hour markers (rose gold batons)
        const hourMarkers = Array.from({ length: 12 }, (_, i) => {
            const angle = i * 30; // 360/12
            const isLarge = i % 3 === 0; // 12, 3, 6, 9 are larger
            return `<div class="tp-hour-marker ${isLarge ? 'large' : ''}" style="--angle: ${angle}deg"></div>`;
        }).join('');

        // Generate 60 minute ticks
        const minuteTicks = Array.from({ length: 60 }, (_, i) => {
            const angle = i * 6; // 360/60
            if (i % 5 === 0) return ''; // Skip where hour markers are
            return `<div class="tp-minute-tick" style="--angle: ${angle}deg"></div>`;
        }).join('');

        return `
            <div class="timepiece-widget" aria-label="Time and date">
                <div class="tp-case">
                    <div class="tp-watch">
                        <!-- Outer steel case -->
                        <div class="tp-outer-case"></div>
                        
                        <!-- Diamond bezel -->
                        <div class="tp-bezel">
                            <div class="tp-diamonds">${diamonds}</div>
                        </div>
                        
                        <!-- Rose gold inner ring -->
                        <div class="tp-inner-ring"></div>
                        
                        <!-- Dial -->
                        <div class="tp-dial">
                            <!-- Minute ticks -->
                            <div class="tp-minute-ticks">${minuteTicks}</div>
                            
                            <!-- Hour markers -->
                            <div class="tp-hour-markers">${hourMarkers}</div>
                            
                            <!-- Date window -->
                            <div class="tp-date-window">
                                <span class="tp-date">—</span>
                            </div>
                            
                            <!-- Hands -->
                            <div class="tp-hands">
                                <div class="tp-hand tp-hour"></div>
                                <div class="tp-hand tp-minute"></div>
                                <div class="tp-hand tp-second"></div>
                                <div class="tp-center"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tp-caption">
                    <div class="tp-caption-left">
                        <div class="tp-weekday">—</div>
                        <div class="tp-monthday">—</div>
                    </div>
                    <div class="tp-caption-right">
                        <div class="tp-digital">—:—</div>
                    </div>
                </div>
            </div>
        `;
    }

    afterRender() {
        this.update();
        this._tickInterval = setInterval(() => this.update(), 100);
    }

    update() {
        const now = new Date();

        const ms = now.getMilliseconds();
        const s = now.getSeconds() + ms / 1000;
        const m = now.getMinutes() + s / 60;
        const h = (now.getHours() % 12) + m / 60;

        const secAngle = s * 6;
        const minAngle = m * 6;
        const hourAngle = h * 30;

        const root = this.$('.timepiece-widget');
        if (root) {
            root.style.setProperty('--tp-sec-angle', `${secAngle}deg`);
            root.style.setProperty('--tp-min-angle', `${minAngle}deg`);
            root.style.setProperty('--tp-hour-angle', `${hourAngle}deg`);
        }

        const dateEl = this.$('.tp-date');
        if (dateEl) dateEl.textContent = String(now.getDate());

        const weekdayEl = this.$('.tp-weekday');
        if (weekdayEl) {
            weekdayEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
        }

        const monthdayEl = this.$('.tp-monthday');
        if (monthdayEl) {
            monthdayEl.textContent = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }

        const digitalEl = this.$('.tp-digital');
        if (digitalEl) {
            digitalEl.textContent = now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }

    destroy() {
        super.destroy();
        if (this._tickInterval) clearInterval(this._tickInterval);
    }
}

window.TimepieceWidget = TimepieceWidget;
