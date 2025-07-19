# Floating Headings

An Obsidian plugin that displays a floating, collapsible outline of your note's headings on the right side of the editor.

## Features

-   **Collapsed sidebar**: Shows visual indicators for each heading as different sized lines
-   **Hover to expand**: Full heading text appears in a panel
-   **Click to navigate**: Jump directly to any heading in your document
-   **Heading level filtering**: Choose which heading levels to display (H1-H6)
-   **Visual customization**: Customize colors, panel size, and animation speed
-   **HTML parsing**: Option to parse HTML heading elements
-   **Custom parsing**: Support for custom regex patterns to parse non-standard headings

## Installation

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/k0src/Floating-Headings-Obsidian-Plugin/releases)
2. Extract the files to your vault's `.obsidian/plugins/floating-headings/` folder
3. Enable the plugin in Obsidian's Community Plugins settings

### From Obsidian Community Plugins

_Coming soon - pending review_

## Settings

Access settings via **Settings → Community Plugins → Floating Headings**

### General Settings

-   **Enable plugin**: Toggle the plugin on/off
-   **Maximum heading level**: Filter headings by level
-   **Animation duration**: Control transition speed

### Visual Customization

-   **Panel width**: Adjust the expanded panel width
-   **Panel max height**: Set maximum height for the headings panel
-   **Collapsed width**: Width of the collapsed sidebar
-   **Panel background color**: Custom background color
-   **Collapsed line color**: Color for heading indicators

### Advanced Settings

-   **Parse HTML elements**: Enable parsing of HTML heading tags
-   **Custom regex pattern**: Define your own heading detection pattern

### Custom Regex Examples

-   **Numbered headings**: `^(\d+\.)\s+(.+)$` - Matches "1. Title"
-   **Mixed markdown**: `^(#{1,6}|\d+\.)\s+(.+)$` - Matches both # and numbered headings

## Theming

-   `--text-normal`: Heading text color
-   `--text-muted`: Collapsed line indicators
-   `--background-primary`: Panel background
-   `--background-modifier-border`: Panel border
-   `--background-modifier-hover`: Hover effects

### Custom CSS

Add custom styles in your `snippets` folder:

```css
/* Customize the floating headings container */
.floating-headings-container {
	/* Your custom styles */
}

/* Style the collapsed sidebar */
.floating-headings-collapsed {
	/* Your custom styles */
}

/* Style the expanded panel */
.floating-headings-expanded {
	/* Your custom styles */
}

/* Style individual heading items */
.floating-heading-item {
	/* Your custom styles */
}
```

### Reporting Issues

Found a bug or have a feature request? Please create an issue on the [GitHub repository](https://github.com/k0src/Floating-Headings-Obsidian-Plugin/issues).

## Contributing

Contributions are welcome. Please feel free to submit pull requests or create issues for bugs and feature requests.

### Development Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` for development mode
4. Run `npm run build` for production build

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
