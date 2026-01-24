/**
 * Dashboard Controller
 * Drag & drop grid-based widget management using Gridstack
 */

class Dashboard {
    constructor(config = {}) {
        this.container = null;
        this.grid = null;
        this.widgets = new Map();
        this.widgetRegistry = new Map(); // Available widget types
        this.isEditMode = false;
        
        // Calculate optimal cell height for the screen
        const optimalConfig = this.calculateOptimalGrid(config);
        
        this.config = {
            title: config.title || 'Home Dashboard',
            showHeader: config.showHeader !== false,
            columns: optimalConfig.columns,
            rowHeight: optimalConfig.cellHeight,
            cellHeight: optimalConfig.cellHeight,
            margin: optimalConfig.margin,
            targetRows: optimalConfig.targetRows,
            isTablet: optimalConfig.isTablet,
            ...config,
            // Override with calculated values if auto
            cellHeight: config.cellHeight === 'auto' ? optimalConfig.cellHeight : (config.cellHeight || optimalConfig.cellHeight),
            margin: config.margin === 'auto' ? optimalConfig.margin : (config.margin || optimalConfig.margin)
        };
        
        // Load saved layout
        this.savedLayout = this.loadLayout();
    }

    /**
     * Calculate optimal grid dimensions based on screen size
     * Optimized for 16:10 tablets like Xiaomi Redmi Pad 2 (2560x1600)
     */
    calculateOptimalGrid(config) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const aspectRatio = screenWidth / screenHeight;
        
        // Detect 16:10 tablet (aspect ratio between 1.5 and 1.7)
        const isTablet16x10 = aspectRatio >= 1.5 && aspectRatio <= 1.7 && screenWidth >= 1200;
        const isHighDpiTablet = screenWidth >= 2000 && screenHeight >= 1400;
        
        // Default configuration
        let columns = config.columns || 12;
        let margin = config.margin || 12;
        let targetRows = 8; // Target number of rows to fill the screen
        
        // Header height (matches CSS)
        let headerHeight = 60;
        let gridPadding = 16;
        
        if (isHighDpiTablet) {
            // Xiaomi Redmi Pad 2 or similar high-res tablet
            headerHeight = 72;
            gridPadding = 24;
            margin = 16;
            targetRows = 8; // 8 rows fits well for 16:10
        } else if (isTablet16x10) {
            // Standard 16:10 tablet
            headerHeight = 56;
            gridPadding = 20;
            margin = 14;
            targetRows = 8;
        }
        
        // Calculate available height for the grid
        const availableHeight = screenHeight - headerHeight - (gridPadding * 2);
        
        // Calculate cell height to fit exactly targetRows
        // Formula: availableHeight = (targetRows * cellHeight) + ((targetRows - 1) * margin)
        // Solving for cellHeight: cellHeight = (availableHeight - (targetRows - 1) * margin) / targetRows
        const cellHeight = Math.floor((availableHeight - (targetRows - 1) * margin) / targetRows);
        
        console.log(`[Dashboard] Screen: ${screenWidth}x${screenHeight}, Aspect: ${aspectRatio.toFixed(2)}`);
        console.log(`[Dashboard] Tablet: ${isTablet16x10 ? 'Yes' : 'No'}, High-DPI: ${isHighDpiTablet ? 'Yes' : 'No'}`);
        console.log(`[Dashboard] Grid: ${columns} cols, ${targetRows} rows, cell height: ${cellHeight}px, margin: ${margin}px`);
        
        return {
            columns,
            cellHeight: Math.max(cellHeight, 60), // Minimum cell height of 60px
            margin,
            targetRows,
            isTablet: isTablet16x10,
            isHighDpiTablet
        };
    }

    /**
     * Register a widget type that can be added to the dashboard
     */
    registerWidget(type, WidgetClass, defaultConfig = {}) {
        this.widgetRegistry.set(type, { WidgetClass, defaultConfig });
    }

    /**
     * Initialize the dashboard
     */
    init(container) {
        if (typeof container === 'string') {
            this.container = document.querySelector(container);
        } else {
            this.container = container;
        }

        if (!this.container) {
            throw new Error('Dashboard container not found');
        }

        this.render();
        this.initGrid();
        this.startClock();
        this.setupKeyboardShortcuts();
        this.setupFullscreenListeners();
    }

    /**
     * Render the dashboard structure
     */
    render() {
        this.container.innerHTML = `
            <div class="dashboard">
                ${this.config.showHeader ? this.renderHeader() : ''}
                <div class="grid-stack"></div>
                ${this.renderWidgetPicker()}
            </div>
        `;
    }

    renderHeader() {
        return `
            <header class="dashboard-header">
                <h1 class="dashboard-title">${this.config.title}</h1>
                <div class="dashboard-controls">
                    <div class="dashboard-clock">
                        <span class="dashboard-date"></span>
                        <span class="dashboard-time"></span>
                    </div>
                    <button class="fullscreen-toggle" onclick="dashboard.toggleFullscreen()" title="Toggle Fullscreen">
                        <span class="fullscreen-icon">⛶</span>
                    </button>
                    <button class="edit-toggle" onclick="dashboard.toggleEditMode()">
                        <span class="edit-icon">⚙</span>
                        <span class="edit-label">Edit</span>
                    </button>
                </div>
            </header>
        `;
    }

    renderWidgetPicker() {
        return `
            <div class="widget-picker hidden">
                <div class="widget-picker-header">
                    <h3>Add Widget</h3>
                    <button class="picker-close" onclick="dashboard.closeWidgetPicker()">×</button>
                </div>
                <div class="widget-picker-grid"></div>
            </div>
            <button class="add-widget-fab hidden" onclick="dashboard.openWidgetPicker()">
                <span>+</span>
            </button>
        `;
    }

    /**
     * Initialize Gridstack
     */
    initGrid() {
        this.grid = GridStack.init({
            column: this.config.columns,
            cellHeight: this.config.cellHeight,
            margin: this.config.margin,
            float: true,
            animate: true,
            draggable: { handle: '.widget-drag-handle' },
            resizable: { handles: 'e, se, s, sw, w' },
            disableDrag: true,
            disableResize: true,
            minRow: 1,
        }, this.container.querySelector('.grid-stack'));

        // Save layout on change
        this.grid.on('change', () => {
            this.saveLayout();
        });

        // Update CSS variables for edit mode grid lines
        this.updateGridVariables();
        
        // Handle orientation changes on tablet
        this.setupResizeHandler();
    }

    /**
     * Update CSS variables for grid visualization
     */
    updateGridVariables() {
        const root = document.documentElement;
        root.style.setProperty('--grid-cell-height', `${this.config.cellHeight}px`);
        root.style.setProperty('--grid-columns', this.config.columns);
        root.style.setProperty('--grid-margin', `${this.config.margin}px`);
    }

    /**
     * Handle window resize (especially for tablet orientation changes)
     */
    setupResizeHandler() {
        let resizeTimeout;
        
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Recalculate grid dimensions
                const newConfig = this.calculateOptimalGrid(this.config);
                
                // Only update if significantly different
                if (Math.abs(newConfig.cellHeight - this.config.cellHeight) > 10) {
                    this.config.cellHeight = newConfig.cellHeight;
                    this.config.margin = newConfig.margin;
                    
                    // Update gridstack
                    this.grid.cellHeight(newConfig.cellHeight);
                    this.grid.margin(newConfig.margin);
                    this.updateGridVariables();
                    
                    console.log('[Dashboard] Grid updated after resize');
                }
            }, 250);
        };
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', () => {
            // Delay slightly for orientation change to complete
            setTimeout(handleResize, 100);
        });
    }

    /**
     * Toggle fullscreen mode
     * Works on desktop, tablets, and mobile devices
     */
    toggleFullscreen() {
        const btn = this.container.querySelector('.fullscreen-toggle');
        const icon = btn.querySelector('.fullscreen-icon');
        
        // Check if already in fullscreen (with vendor prefixes)
        const isFullscreen = document.fullscreenElement || 
                            document.webkitFullscreenElement || 
                            document.mozFullScreenElement || 
                            document.msFullscreenElement;
        
        if (!isFullscreen) {
            // Enter fullscreen (try standard first, then vendor prefixes)
            const element = document.documentElement;
            const requestFullscreen = element.requestFullscreen || 
                                    element.webkitRequestFullscreen || 
                                    element.mozRequestFullScreen || 
                                    element.msRequestFullscreen;
            
            if (requestFullscreen) {
                requestFullscreen.call(element).then(() => {
                    icon.textContent = '⛶';
                    btn.title = 'Exit Fullscreen';
                }).catch(err => {
                    console.warn('Fullscreen failed:', err);
                });
            }
        } else {
            // Exit fullscreen
            const exitFullscreen = document.exitFullscreen || 
                                 document.webkitExitFullscreen || 
                                 document.mozCancelFullScreen || 
                                 document.msExitFullscreen;
            
            if (exitFullscreen) {
                exitFullscreen.call(document).then(() => {
                    icon.textContent = '⛶';
                    btn.title = 'Toggle Fullscreen';
                });
            }
        }
    }

    /**
     * Update fullscreen button state when fullscreen changes
     */
    updateFullscreenButton() {
        const btn = this.container?.querySelector('.fullscreen-toggle');
        if (!btn) return;
        
        const icon = btn.querySelector('.fullscreen-icon');
        const isFullscreen = document.fullscreenElement || 
                            document.webkitFullscreenElement || 
                            document.mozFullScreenElement || 
                            document.msFullscreenElement;
        
        if (isFullscreen) {
            icon.textContent = '⛶';
            btn.title = 'Exit Fullscreen';
        } else {
            icon.textContent = '⛶';
            btn.title = 'Toggle Fullscreen';
        }
    }

    /**
     * Toggle edit mode
     */
    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        
        const dashboard = this.container.querySelector('.dashboard');
        const editBtn = this.container.querySelector('.edit-toggle');
        const fab = this.container.querySelector('.add-widget-fab');
        
        if (this.isEditMode) {
            dashboard.classList.add('edit-mode');
            editBtn.classList.add('active');
            editBtn.querySelector('.edit-label').textContent = 'Done';
            fab.classList.remove('hidden');
            this.grid.enableMove(true);
            this.grid.enableResize(true);
        } else {
            dashboard.classList.remove('edit-mode');
            editBtn.classList.remove('active');
            editBtn.querySelector('.edit-label').textContent = 'Edit';
            fab.classList.add('hidden');
            this.closeWidgetPicker();
            this.grid.enableMove(false);
            this.grid.enableResize(false);
            this.saveLayout();
        }
    }

    /**
     * Open widget picker
     */
    openWidgetPicker() {
        const picker = this.container.querySelector('.widget-picker');
        const grid = picker.querySelector('.widget-picker-grid');
        
        // Populate available widgets
        grid.innerHTML = '';
        this.widgetRegistry.forEach((config, type) => {
            const item = document.createElement('div');
            item.className = 'widget-picker-item';
            item.innerHTML = `
                <div class="picker-item-icon">${config.defaultConfig.icon || '📦'}</div>
                <div class="picker-item-name">${config.defaultConfig.displayName || type}</div>
            `;
            item.onclick = () => this.addWidgetFromPicker(type);
            grid.appendChild(item);
        });
        
        picker.classList.remove('hidden');
    }

    closeWidgetPicker() {
        this.container.querySelector('.widget-picker').classList.add('hidden');
    }

    addWidgetFromPicker(type) {
        const config = this.widgetRegistry.get(type);
        if (!config) return;
        
        const defaults = config.defaultConfig;
        this.addWidget(new config.WidgetClass(defaults), {
            w: defaults.gridW || 4,
            h: defaults.gridH || 4,
            autoPosition: true
        });
        
        this.closeWidgetPicker();
    }

    /**
     * Add a widget to the dashboard
     */
    addWidget(widget, gridOptions = {}) {
        const id = widget.id + '-' + Date.now();
        widget.id = id;
        
        // Create widget wrapper with controls
        const content = document.createElement('div');
        content.className = 'grid-stack-item-content';
        content.innerHTML = `
            <div class="widget-wrapper" data-widget-id="${id}">
                <div class="widget-drag-handle">
                    <span class="drag-dots">⋮⋮</span>
                </div>
                <button class="widget-delete" onclick="dashboard.removeWidget('${id}')">×</button>
                <div class="widget-content"></div>
            </div>
        `;

        // Get saved position or use defaults
        const savedPos = this.savedLayout?.[widget.id.split('-')[0]];
        const options = {
            w: savedPos?.w || gridOptions.w || 4,
            h: savedPos?.h || gridOptions.h || 4,
            x: savedPos?.x ?? gridOptions.x,
            y: savedPos?.y ?? gridOptions.y,
            minW: gridOptions.minW || 2,
            minH: gridOptions.minH || 2,
            autoPosition: gridOptions.autoPosition ?? (savedPos ? false : true),
            content: content.innerHTML
        };

        // Add to grid
        const gridItem = this.grid.addWidget(options);
        
        // Initialize widget
        const widgetContainer = gridItem.querySelector('.widget-content');
        widget.init();
        widget.mount(widgetContainer);
        
        // Store reference
        this.widgets.set(id, { widget, gridItem });
        
        return widget;
    }

    /**
     * Remove a widget
     */
    removeWidget(widgetId) {
        const entry = this.widgets.get(widgetId);
        if (entry) {
            entry.widget.destroy();
            this.grid.removeWidget(entry.gridItem);
            this.widgets.delete(widgetId);
            this.saveLayout();
        }
    }

    /**
     * Save layout to localStorage
     */
    saveLayout() {
        const layout = {};
        this.grid.getGridItems().forEach(item => {
            const widgetId = item.querySelector('.widget-wrapper')?.dataset.widgetId;
            if (widgetId) {
                const baseId = widgetId.split('-')[0];
                layout[baseId] = {
                    x: parseInt(item.getAttribute('gs-x')),
                    y: parseInt(item.getAttribute('gs-y')),
                    w: parseInt(item.getAttribute('gs-w')),
                    h: parseInt(item.getAttribute('gs-h'))
                };
            }
        });
        localStorage.setItem('dashboard-layout', JSON.stringify(layout));
    }

    /**
     * Load layout from localStorage
     */
    loadLayout() {
        try {
            return JSON.parse(localStorage.getItem('dashboard-layout')) || {};
        } catch {
            return {};
        }
    }

    /**
     * Clear saved layout
     */
    clearLayout() {
        localStorage.removeItem('dashboard-layout');
        location.reload();
    }

    /**
     * Update clock
     */
    updateClock() {
        const now = new Date();
        const dateEl = this.container.querySelector('.dashboard-date');
        const timeEl = this.container.querySelector('.dashboard-time');
        
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        }
        
        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }

    startClock() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape to exit edit mode or fullscreen
            if (e.key === 'Escape' && this.isEditMode) {
                this.toggleEditMode();
            }
            // E to toggle edit mode
            if (e.key === 'e' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
                this.toggleEditMode();
            }
            // F to toggle fullscreen
            if (e.key === 'f' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
                this.toggleFullscreen();
            }
        });
    }

    setupFullscreenListeners() {
        // Listen for fullscreen changes (including when user exits via gesture on tablet)
        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.updateFullscreenButton();
            });
        });
    }

    /**
     * Get a widget by ID
     */
    getWidget(widgetId) {
        return this.widgets.get(widgetId)?.widget;
    }

    /**
     * Refresh all widgets
     */
    async refreshAll() {
        const promises = Array.from(this.widgets.values()).map(e => e.widget.refresh());
        await Promise.all(promises);
    }

    /**
     * Destroy dashboard
     */
    destroy() {
        this.widgets.forEach(entry => entry.widget.destroy());
        this.widgets.clear();
        this.grid?.destroy();
        this.container.innerHTML = '';
    }
}

window.Dashboard = Dashboard;
