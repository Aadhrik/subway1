# Creating a New Widget

## Quick Start

1. Create a folder: `widgets/your-widget/`
2. Create two files:
   - `your-widget.js` - Widget logic
   - `your-widget.css` - Widget styles

## Widget JavaScript Template

```javascript
/**
 * Your Widget Name
 * Description of what it does
 */
class YourWidget extends Widget {
    constructor(config = {}) {
        super({
            id: 'your-widget',
            title: config.title || 'Your Widget',
            size: config.size || 'medium',
            refreshInterval: config.refreshInterval || 60000, // 1 minute
            ...config
        });

        // Your custom config
        this.someSetting = config.someSetting || 'default';
    }

    /**
     * Return the HTML for your widget
     */
    render() {
        return `
            <div class="your-widget">
                <h3 class="your-widget-title">${this.title}</h3>
                <div class="your-widget-content">
                    Loading...
                </div>
            </div>
        `;
    }

    /**
     * Called after render - set up event listeners, start timers, etc.
     */
    afterRender() {
        this.refresh();
    }

    /**
     * Fetch data and update the display
     */
    async refresh() {
        try {
            // Fetch your data
            const response = await fetch('/api/your-endpoint');
            const data = await response.json();
            
            // Update the display
            const content = this.$('.your-widget-content');
            content.innerHTML = `<p>${data.someValue}</p>`;
            
        } catch (error) {
            console.error('Error in YourWidget:', error);
            this.$('.your-widget-content').innerHTML = 'Error loading data';
        }
    }
}

// Register the widget globally
window.YourWidget = YourWidget;
```

## Widget CSS Template

```css
/**
 * Your Widget Styles
 */

.your-widget {
    padding: 20px;
    height: 100%;
    background: #111;
    color: #fff;
}

.your-widget-title {
    font-size: 1.2rem;
    margin-bottom: 16px;
    color: #ff6600;
}

.your-widget-content {
    /* Your content styles */
}
```

## Adding to Dashboard

In `index.html`:

```html
<!-- In <head> -->
<link rel="stylesheet" href="widgets/your-widget/your-widget.css">

<!-- Before closing </body> -->
<script src="widgets/your-widget/your-widget.js"></script>

<!-- In the init script -->
<script>
    dashboard.addWidget(new YourWidget({
        size: 'medium',
        someSetting: 'custom value'
    }));
</script>
```

## Widget Sizes

| Size | Grid Columns | Grid Rows |
|------|-------------|-----------|
| `small` | 3 | 2 |
| `medium` | 4 | 2 |
| `large` | 6 | 3 |
| `wide` | 8 | 2 |
| `tall` | 4 | 4 |
| `full` | 12 | 3 |

## Helper Methods

The base `Widget` class provides these helpers:

- `this.$(selector)` - Query element within widget
- `this.$$(selector)` - Query all elements within widget
- `this.container` - The widget's DOM element
- `this.refresh()` - Called automatically at `refreshInterval`

## Lifecycle

1. `constructor()` - Set up config
2. `init()` - Called once when added to dashboard
3. `render()` - Return HTML string
4. `afterRender()` - Set up listeners, fetch initial data
5. `refresh()` - Called periodically to update data
6. `destroy()` - Clean up when removed

