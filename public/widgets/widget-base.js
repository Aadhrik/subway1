/**
 * Base Widget Class
 * All widgets should extend this class
 */
class Widget {
    constructor(config = {}) {
        this.id = config.id || this.constructor.name.toLowerCase();
        this.title = config.title || 'Widget';
        this.size = config.size || 'medium'; // small, medium, large, full
        this.refreshInterval = config.refreshInterval || 30000; // 30 seconds default
        this.container = null;
        this.intervalId = null;
    }

    /**
     * Initialize the widget - called once when widget is added to dashboard
     * Override this in your widget
     */
    async init() {
        // Override in subclass
    }

    /**
     * Render the widget HTML
     * Override this in your widget
     * @returns {string} HTML string
     */
    render() {
        return `<div class="widget-placeholder">Widget: ${this.title}</div>`;
    }

    /**
     * Called after render to set up event listeners, etc.
     * Override this in your widget
     */
    afterRender() {
        // Override in subclass
    }

    /**
     * Refresh/update the widget data
     * Override this in your widget
     */
    async refresh() {
        // Override in subclass
    }

    /**
     * Clean up when widget is removed
     * Override this in your widget if needed
     */
    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    /**
     * Mount the widget to a container element
     * @param {HTMLElement} container 
     */
    mount(container) {
        this.container = container;
        this.container.innerHTML = this.render();
        this.container.classList.add(`widget-${this.size}`);
        this.container.dataset.widgetId = this.id;
        this.afterRender();
        
        // Start refresh interval
        if (this.refreshInterval > 0) {
            this.intervalId = setInterval(() => this.refresh(), this.refreshInterval);
        }
    }

    /**
     * Get the widget's container element
     * @returns {HTMLElement}
     */
    getElement() {
        return this.container;
    }

    /**
     * Helper to query elements within the widget
     * @param {string} selector 
     * @returns {HTMLElement}
     */
    $(selector) {
        return this.container?.querySelector(selector);
    }

    /**
     * Helper to query all elements within the widget
     * @param {string} selector 
     * @returns {NodeList}
     */
    $$(selector) {
        return this.container?.querySelectorAll(selector);
    }
}

// Export for use in other modules
window.Widget = Widget;

