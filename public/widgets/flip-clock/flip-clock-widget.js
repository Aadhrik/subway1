/**
 * Flip Clock Widget
 * Elegant split-flap style digital clock
 * White flippers that flip down to reveal the next number
 */
class FlipClockWidget extends Widget {
    constructor(config = {}) {
        super({
            id: 'flip-clock',
            title: config.title || 'Flip Clock',
            size: config.size || 'medium',
            refreshInterval: 0,
            ...config
        });
        
        this._tickInterval = null;
        this._lastTime = { h1: '', h2: '', m1: '', m2: '', s1: '', s2: '' };
        this.showSeconds = config.showSeconds !== false;
        this.use24Hour = config.use24Hour || false;
    }

    render() {
        return `
            <div class="flip-clock-widget">
                <div class="fc-clock">
                    <div class="fc-group fc-hours">
                        <div class="fc-flip" data-digit="h1">
                            <div class="fc-flip-card">
                                <div class="fc-flip-front">
                                    <span class="fc-digit">0</span>
                                </div>
                                <div class="fc-flip-back">
                                    <span class="fc-digit">0</span>
                                </div>
                            </div>
                            <div class="fc-static">
                                <span class="fc-digit">0</span>
                            </div>
                        </div>
                        <div class="fc-flip" data-digit="h2">
                            <div class="fc-flip-card">
                                <div class="fc-flip-front">
                                    <span class="fc-digit">0</span>
                                </div>
                                <div class="fc-flip-back">
                                    <span class="fc-digit">0</span>
                                </div>
                            </div>
                            <div class="fc-static">
                                <span class="fc-digit">0</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="fc-separator">
                        <span class="fc-colon">:</span>
                    </div>
                    
                    <div class="fc-group fc-minutes">
                        <div class="fc-flip" data-digit="m1">
                            <div class="fc-flip-card">
                                <div class="fc-flip-front">
                                    <span class="fc-digit">0</span>
                                </div>
                                <div class="fc-flip-back">
                                    <span class="fc-digit">0</span>
                                </div>
                            </div>
                            <div class="fc-static">
                                <span class="fc-digit">0</span>
                            </div>
                        </div>
                        <div class="fc-flip" data-digit="m2">
                            <div class="fc-flip-card">
                                <div class="fc-flip-front">
                                    <span class="fc-digit">0</span>
                                </div>
                                <div class="fc-flip-back">
                                    <span class="fc-digit">0</span>
                                </div>
                            </div>
                            <div class="fc-static">
                                <span class="fc-digit">0</span>
                            </div>
                        </div>
                    </div>
                    
                    ${this.showSeconds ? `
                    <div class="fc-separator">
                        <span class="fc-colon">:</span>
                    </div>
                    
                    <div class="fc-group fc-seconds">
                        <div class="fc-flip" data-digit="s1">
                            <div class="fc-flip-card">
                                <div class="fc-flip-front">
                                    <span class="fc-digit">0</span>
                                </div>
                                <div class="fc-flip-back">
                                    <span class="fc-digit">0</span>
                                </div>
                            </div>
                            <div class="fc-static">
                                <span class="fc-digit">0</span>
                            </div>
                        </div>
                        <div class="fc-flip" data-digit="s2">
                            <div class="fc-flip-card">
                                <div class="fc-flip-front">
                                    <span class="fc-digit">0</span>
                                </div>
                                <div class="fc-flip-back">
                                    <span class="fc-digit">0</span>
                                </div>
                            </div>
                            <div class="fc-static">
                                <span class="fc-digit">0</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="fc-ampm"></div>
                </div>
                
                <div class="fc-date">
                    <span class="fc-weekday"></span>
                    <span class="fc-fulldate"></span>
                </div>
            </div>
        `;
    }

    afterRender() {
        this.update();
        this._tickInterval = setInterval(() => this.update(), 200);
    }

    flipDigit(key, newValue) {
        const container = this.$(`[data-digit="${key}"]`);
        if (!container) return;
        
        const flipCard = container.querySelector('.fc-flip-card');
        const staticEl = container.querySelector('.fc-static .fc-digit');
        const frontEl = container.querySelector('.fc-flip-front .fc-digit');
        const backEl = container.querySelector('.fc-flip-back .fc-digit');
        
        const oldValue = this._lastTime[key];
        
        if (oldValue === newValue) return;
        
        // Remove any existing animation
        flipCard.classList.remove('flip');
        
        // Set the OLD value on the front (what we're flipping away from)
        frontEl.textContent = oldValue || '0';
        
        // Set the NEW value on the back and static
        backEl.textContent = newValue;
        staticEl.textContent = newValue;
        
        // Force reflow to reset animation
        void flipCard.offsetWidth;
        
        // Trigger flip animation
        flipCard.classList.add('flip');
        
        // Store for next comparison
        this._lastTime[key] = newValue;
    }

    update() {
        const now = new Date();
        
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        
        // Handle 12-hour format
        let ampm = '';
        if (!this.use24Hour) {
            ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
        }
        
        const h = String(hours).padStart(2, '0');
        const m = String(minutes).padStart(2, '0');
        const s = String(seconds).padStart(2, '0');
        
        // Flip each digit
        this.flipDigit('h1', h[0]);
        this.flipDigit('h2', h[1]);
        this.flipDigit('m1', m[0]);
        this.flipDigit('m2', m[1]);
        
        if (this.showSeconds) {
            this.flipDigit('s1', s[0]);
            this.flipDigit('s2', s[1]);
        }
        
        // Update AM/PM
        const ampmEl = this.$('.fc-ampm');
        if (ampmEl && !this.use24Hour) {
            ampmEl.textContent = ampm;
        }
        
        // Update date
        const weekdayEl = this.$('.fc-weekday');
        if (weekdayEl) {
            weekdayEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
        }
        
        const fulldateEl = this.$('.fc-fulldate');
        if (fulldateEl) {
            fulldateEl.textContent = now.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
        }
    }

    destroy() {
        super.destroy();
        if (this._tickInterval) clearInterval(this._tickInterval);
    }
}

window.FlipClockWidget = FlipClockWidget;

