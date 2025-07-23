# Floating Headings

An Obsidian plugin that displays a floating, collapsible outline of your note's headings on the right side of the editor.

## Features

-   **Collapsed sidebar**: Shows visual indicators for each heading as different sized lines.
-   **Hover to expand**: Full heading text appears in a panel.
-   **Click to navigate**: Jump directly to any heading in your document.
-   **Heading level filtering**: Choose which heading levels to display (H1-H6).
-   **Visual customization**: Customize colors, panel size, and animation speed.
-   **HTML parsing**: Option to parse HTML heading elements.
-   **Custom parsing**: Support for custom regex patterns to parse non-standard headings.

## Installation

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/k0src/Floating-Headings-Obsidian-Plugin/releases).
2. Extract the files to your vault's `.obsidian/plugins/floating-headings/` folder.
3. Enable the plugin in Obsidian's Community Plugins settings.

### From Obsidian Community Plugins

_Coming soon_

## Settings

Access settings via **Settings → Community Plugins → Floating Headings**

### General Settings

-   **Enable plugin**: Toggle the plugin on/off.
-   **Hide panel on navigation**: Automatically hide the panel when navigating to a heading.
-   **Vertical position**: Vertical position of the sidebar panel.
-   **Maximum heading level**: Filter headings by level.
-   **Sidebar position**: Choose which side of the screen the sidebar appears on.

### Visual Customization

-   **Panel width**: Adjust the expanded panel width.
-   **Panel max height**: Set maximum height for the panel.
-   **Collapsed width**: Width of the collapsed sidebar
-   **Animation duration**: Control transition speed.
-   **Line thickness**: Set the thickness of the collasped heading lines.
-   **Panel scroll position**: Change the scroll position of the panel when opened. Can be set to the top of the panel, the current header, or the previous scroll position.
-   **Panel background color**: Custom background color.
-   **Collapsed line color**: Color for heading indicators.

### Advanced Settings

-   **Parse HTML elements**: Enable parsing of HTML heading tags
-   **Custom regex pattern**: Define your own heading detection pattern.

> [!NOTE] 
> **The parser processes heading text according to settings priority:**
>
> 1. If a custom Regex pattern is enabled, the `heading_text` named group is displayed in the panel. No other cleaning or filtering is applied.
> 2. If "Parse HTML" is enabled, then HTML tags are removed, then Markdown headings are cleaned.
> 3. If no parsing options are enabled, Markdown heading are cleaned, and the heading text is displayed as-is.

### Custom Regex

Custom Regex patterns can be used to parse and extract heading text from headers. By default, the panel shows the raw text of the heading. If you want to extract specific text, you can define a custom regex pattern, using a named capture group `heading_text`.

#### Custom Regex Examples

**Link heading**

-   **Regex pattern:**
    ```regex
    /^(#{1,6})\s+\[\[(?<heading_text>[^\]]+)\]\]\s*$/
    ```
-   **Example match:**
    ```
    # [[Some Page]]
    ```
-   **Extracted heading text:** `Some Page`

**Span with link**

-   **Regex pattern:**
    ```regex
    /^(#{1,6})\s+<span[^>]*>\[\[.*?\]\]\s+(?<heading_text>.*?)<\/span>$/
    ```
-   **Example match:**
    ```
    ## <span style="color:red">[[note]] Red Heading</span>
    ```
-   **Extracted heading text:** `Red Heading`

**Inline LaTeX**

-   **Regex pattern:**
    ```regex
    /^(#{1,6})\s+\$(?<heading_text>[^$]+)\$\s*$/
    ```
-   **Example match:**
    ```
    ## $O^n$
    ```
-   **Extracted heading text:** `O^n`

**Bold heading**

-   **Regex pattern:**
    ```regex
    /^(#{1,6})\s+\*\*(?<heading_text>.+?)\*\*\s*$/
    ```
-   **Example match:**
    ```
    ### **Bold Heading**
    ```
-   **Extracted heading text:** `Bold Heading`

**List heading**

-   **Regex pattern:**
    ```regex
    /^(#{1,6})\s+[a-zA-Z]\.\s+(?<heading_text>.+)$/
    ```
-   **Example match:**
    ```
    #### a. List Heading
    ```
-   **Extracted heading text:** `List Heading`

## Theming

### Obsidian CSS Variables

The plugin uses Obsidian's built-in CSS variables for consistent theming:

-   `--text-normal`: Heading text color.
-   `--text-muted`: Collapsed line indicators and vertical lines.
-   `--text-accent`: Active heading highlight color.
-   `--background-primary`: Panel background (fallback).
-   `--background-modifier-border`: Panel border.
-   `--background-modifier-hover`: Hover effects.
-   `--color-accent`: Active heading color.

### Plugin-Specific CSS Variables

Override these custom properties to change the appearance of the plugin:

-   `--floating-headings-collapsed-width`: Width of the collapsed sidebar (default: 16px).
-   `--floating-headings-panel-width`: Width of the expanded panel (default: 240px).
-   `--floating-headings-panel-max-height`: Maximum height of the panel (default: 400px).
-   `--floating-headings-panel-bg`: Custom panel background color.
-   `--floating-headings-line-color`: Color of collapsed heading lines.
-   `--floating-headings-line-thickness`: Thickness of collapsed heading lines (default: 3px).
-   `--floating-headings-animation-duration`: Animation speed in milliseconds (default: 150ms).

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

/* Level-specific styling */
.floating-heading-item[data-level="1"] {
	/* H1 heading styles */
}

.floating-heading-item[data-level="2"] {
	/* H2 heading styles */
}

/* Active heading highlight */
.floating-heading-item.active {
	/* Active heading styles */
}
```

### Reporting Issues

Found a bug or have a feature request? Please create an issue on the [GitHub repository](https://github.com/k0src/Floating-Headings-Obsidian-Plugin/issues).

## Contributing

Contributions are welcome. Please feel free to submit pull requests or create issues for bugs and feature requests.

### Development Setup

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` for development mode.
4. Run `npm run build` for production build.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## To-Do

-   [x] Improved Regex support
-   [x] Dynamic indentation
-   [ ] Draw bullets and lines
-   [ ] Collapsible heading groups
-   [ ] Filter input
-   [ ] Lock open/close hotkey
-   [ ] Support for multiple Regex patterns
-   [ ] Per-note settings with YAML frontmatter
-   [ ] Finalize styles
