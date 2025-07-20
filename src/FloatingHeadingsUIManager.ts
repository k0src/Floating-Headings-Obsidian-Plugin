import { MarkdownView } from "obsidian";
import { HeadingInfo } from "./types";
import type FloatingHeadingsPlugin from "../main";

export class FloatingHeadingsUIManager {
	private plugin: FloatingHeadingsPlugin;
	private containerElement: HTMLElement | null = null;
	private collapsedSidebar: HTMLElement | null = null;
	private expandedPanel: HTMLElement | null = null;
	private isHovered: boolean = false;
	private hoverTimeout: number | null = null;

	private expandedItemHeight: number = 0;
	private expandedPadding: number = 0;

	constructor(plugin: FloatingHeadingsPlugin) {
		this.plugin = plugin;
	}

	mount(parentElement: HTMLElement) {
		this.cleanup();

		this.containerElement = this.createContainer();
		this.collapsedSidebar = this.createCollapsedSidebar();
		this.expandedPanel = this.createExpandedPanel();

		this.containerElement.appendChild(this.collapsedSidebar);
		this.containerElement.appendChild(this.expandedPanel);
		parentElement.appendChild(this.containerElement);

		this.updateCSSProperties();
		this.calculateDimensionsFromStyles();
		this.updateCollapsedView();
		this.updateExpandedView();
	}

	/* Calcuate size of panel to set height of collasped panel */
	private calculateDimensionsFromStyles() {
		if (!this.expandedPanel || !this.containerElement) return;

		const containerStyles = getComputedStyle(this.containerElement);

		const size22 =
			parseFloat(containerStyles.getPropertyValue("--size-2-2")) || 4;
		const size42 =
			parseFloat(containerStyles.getPropertyValue("--size-4-2")) || 8;
		const fontSizeSmaller =
			parseFloat(containerStyles.getPropertyValue("--font-ui-smaller")) ||
			12;
		const lineHeightTight =
			parseFloat(
				containerStyles.getPropertyValue("--line-height-tight")
			) || 1.3;
		this.expandedItemHeight =
			size22 * 2 + fontSizeSmaller * lineHeightTight;
		this.expandedPadding = size42 * 2;
	}

	private createContainer(): HTMLElement {
		const container = createDiv("floating-headings-container");

		if (this.plugin.settings.sidebarPosition === "left") {
			container.addClass("position-left");
		}

		return container;
	}

	private createCollapsedSidebar(): HTMLElement {
		const sidebar = createDiv("floating-headings-collapsed");

		sidebar.addEventListener("mouseenter", () => {
			this.onMouseEnter();
		});

		sidebar.addEventListener("mouseleave", () => {
			this.onMouseLeave();
		});

		return sidebar;
	}

	private createExpandedPanel(): HTMLElement {
		const panel = createDiv("floating-headings-expanded");

		panel.addEventListener("mouseenter", () => {
			this.onMouseEnter();
		});

		panel.addEventListener("mouseleave", () => {
			this.onMouseLeave();
		});

		return panel;
	}

	private onMouseEnter() {
		this.isHovered = true;

		if (this.hoverTimeout) {
			clearTimeout(this.hoverTimeout);
			this.hoverTimeout = null;
		}

		this.showExpandedPanel();
	}

	private onMouseLeave() {
		this.hoverTimeout = window.setTimeout(() => {
			this.isHovered = false;
			this.hideExpandedPanel();
		}, 100);
	}

	private showExpandedPanel() {
		if (!this.expandedPanel || !this.collapsedSidebar) return;

		this.collapsedSidebar.classList.add("hovered");
		this.expandedPanel.classList.add("visible");

		this.updateActiveHeading();
		this.applyScrollPosition();
	}

	private hideExpandedPanel() {
		if (!this.expandedPanel || !this.collapsedSidebar) return;

		this.collapsedSidebar.classList.remove("hovered");
		this.expandedPanel.classList.remove("visible");
	}

	private applyScrollPosition() {
		if (!this.expandedPanel) return;

		const settings = this.plugin.settings;

		switch (settings.panelScrollPosition) {
			case "top":
				this.expandedPanel.scrollTop = 0;
				break;
			case "previous":
				break;
			case "closest":
				this.scrollToClosestHeader();
				break;
		}
	}

	private scrollToClosestHeader() {
		if (!this.expandedPanel) return;

		const markdownView = this.plugin.getActiveMarkdownView();
		if (!markdownView) return;

		const headings = this.plugin.getCurrentHeadings();
		if (headings.length === 0) return;

		const closestHeadingIndex = this.findClosestHeading(
			markdownView,
			headings
		);
		if (closestHeadingIndex === null) return;

		const items = this.expandedPanel.querySelectorAll(
			".floating-heading-item"
		);
		const targetItem = items[closestHeadingIndex] as HTMLElement;

		if (targetItem) {
			const panelHeight = this.expandedPanel.clientHeight;
			const itemHeight = targetItem.offsetHeight;
			const itemTop = targetItem.offsetTop;

			const scrollPosition = itemTop - panelHeight / 2 + itemHeight / 2;
			this.expandedPanel.scrollTop = Math.max(0, scrollPosition);
		}
	}

	updateCollapsedView() {
		if (!this.collapsedSidebar) return;

		this.collapsedSidebar.empty();

		const headings = this.plugin.getCurrentHeadings();
		const settings = this.plugin.settings;

		const containerMaxHeight = settings.panelMaxHeight;
		const lineHeight = 3;
		const lineMargin = 6;
		const padding = 8;
		const totalLineHeight = lineHeight + lineMargin;
		const maxFittingLines = Math.floor(
			(containerMaxHeight - padding) / totalLineHeight
		);

		const fittingHeadings = headings.slice(0, maxFittingLines);

		const panelHeight = Math.min(
			headings.length * this.expandedItemHeight + this.expandedPadding,
			containerMaxHeight
		);

		this.collapsedSidebar.style.height = `${panelHeight}px`;

		fittingHeadings.forEach((heading, index) => {
			const line = this.createHeadingLine(heading, index);
			this.collapsedSidebar!.appendChild(line);
		});
	}

	updateExpandedView() {
		if (!this.expandedPanel) return;

		this.expandedPanel.empty();

		const headings = this.plugin.getCurrentHeadings();

		headings.forEach((heading, index) => {
			const item = this.createExpandedHeadingItem(heading, index);
			this.expandedPanel!.appendChild(item);
		});

		this.updateActiveHeading();
	}

	private createExpandedHeadingItem(
		heading: HeadingInfo,
		index: number
	): HTMLElement {
		const item = createDiv("floating-heading-item");

		item.setAttribute("data-level", heading.level.toString());

		item.textContent = heading.text;
		item.title = heading.text;

		item.addEventListener("click", () => {
			this.scrollToHeading(heading);
			this.setActiveHeading(index);
		});

		return item;
	}

	private createHeadingLine(
		heading: HeadingInfo,
		index: number
	): HTMLElement {
		const line = createDiv("floating-heading-line");

		line.setAttribute("data-level", heading.level.toString());

		return line;
	}

	private scrollToHeading(heading: HeadingInfo) {
		const markdownView = this.plugin.getActiveMarkdownView();
		if (!markdownView) return;

		const isReadingMode =
			!markdownView.getMode || markdownView.getMode() === "preview";

		if (isReadingMode) {
			const readingView = markdownView.containerEl.querySelector(
				".markdown-reading-view"
			);

			if (!readingView) return;

			setTimeout(() => {
				const headingSelectors = ["h1", "h2", "h3", "h4", "h5", "h6"];
				const headingElements = Array.from(
					readingView.querySelectorAll<HTMLHeadingElement>(
						headingSelectors.join(", ")
					)
				);

				const matchText = heading.text.trim();

				for (const el of headingElements) {
					const elText = el.textContent?.trim();
					if (elText === matchText) {
						el.scrollIntoView({
							behavior: "smooth",
							block: "start",
						});
						return;
					}
				}
			}, 50);
		} else {
			const editor = markdownView.editor;
			if (editor) {
				editor.setCursor({ line: heading.line, ch: 0 });
				editor.scrollIntoView(
					{
						from: { line: heading.line, ch: 0 },
						to: { line: heading.line + 1, ch: 0 },
					},
					true
				);
			}
		}
	}

	private updateActiveHeading() {
		if (!this.expandedPanel) return;

		const markdownView = this.plugin.getActiveMarkdownView();
		if (!markdownView) return;

		const headings = this.plugin.getCurrentHeadings();
		if (headings.length === 0) return;

		const items = this.expandedPanel.querySelectorAll(
			".floating-heading-item"
		);
		items.forEach((item) =>
			(item as HTMLElement).classList.remove("active")
		);

		const closestHeading = this.findClosestHeading(markdownView, headings);
		if (closestHeading !== null) {
			const targetItem = Array.from(items).find(
				(item, index) => index === closestHeading
			);
			if (targetItem) {
				(targetItem as HTMLElement).classList.add("active");
			}
		}
	}

	private setActiveHeading(headingIndex: number) {
		if (!this.expandedPanel) return;

		const items = this.expandedPanel.querySelectorAll(
			".floating-heading-item"
		);

		items.forEach((item) =>
			(item as HTMLElement).classList.remove("active")
		);

		const targetItem = items[headingIndex];
		if (targetItem) {
			(targetItem as HTMLElement).classList.add("active");
		}
	}

	private findClosestHeading(
		markdownView: MarkdownView,
		headings: HeadingInfo[]
	): number | null {
		const isReadingMode =
			!markdownView.getMode || markdownView.getMode() === "preview";

		if (isReadingMode) {
			return this.findClosestHeadingInReadingMode(markdownView, headings);
		} else {
			return this.findClosestHeadingInEditMode(markdownView, headings);
		}
	}

	private findClosestHeadingInEditMode(
		markdownView: MarkdownView,
		headings: HeadingInfo[]
	): number | null {
		const editor = markdownView.editor;
		if (!editor) return null;

		const cursor = editor.getCursor();
		const currentLine = cursor.line;

		let closestIndex = 0;
		let closestDistance = Math.abs(headings[0].line - currentLine);

		for (let i = 1; i < headings.length; i++) {
			const distance = Math.abs(headings[i].line - currentLine);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestIndex = i;
			}
		}

		return closestIndex;
	}

	private findClosestHeadingInReadingMode(
		markdownView: MarkdownView,
		headings: HeadingInfo[]
	): number | null {
		const readingView = markdownView.containerEl.querySelector(
			".markdown-reading-view"
		);
		if (!readingView) return null;

		const scrollTop = readingView.scrollTop;
		const viewportHeight = readingView.clientHeight;
		const viewportCenter = scrollTop + viewportHeight / 2;

		const headingElements = Array.from(
			readingView.querySelectorAll<HTMLHeadingElement>(
				"h1, h2, h3, h4, h5, h6"
			)
		);

		let closestIndex = 0;
		let closestDistance = Infinity;

		for (let i = 0; i < headings.length; i++) {
			const heading = headings[i];
			const matchingElement = headingElements.find(
				(el) => el.textContent?.trim() === heading.text.trim()
			);

			if (matchingElement) {
				const elementTop = matchingElement.offsetTop;
				const distance = Math.abs(elementTop - viewportCenter);

				if (distance < closestDistance) {
					closestDistance = distance;
					closestIndex = i;
				}
			}
		}

		return headings.length > 0 ? closestIndex : null;
	}

	cleanup() {
		if (this.hoverTimeout) {
			clearTimeout(this.hoverTimeout);
			this.hoverTimeout = null;
		}

		if (this.containerElement) {
			this.containerElement.remove();
			this.containerElement = null;
		}
		this.collapsedSidebar = null;
		this.expandedPanel = null;
		this.isHovered = false;
	}

	refresh() {
		this.updateCSSProperties();
		if (this.containerElement && this.containerElement.parentElement) {
			const parent = this.containerElement.parentElement;
			this.cleanup();
			this.mount(parent);
		}
	}

	private updateCSSProperties() {
		if (!this.containerElement) return;

		const settings = this.plugin.settings;

		this.containerElement.classList.toggle(
			"position-left",
			settings.sidebarPosition === "left"
		);

		this.containerElement.style.setProperty(
			"--floating-headings-collapsed-width",
			`${settings.collapsedWidth}px`
		);
		this.containerElement.style.setProperty(
			"--floating-headings-panel-width",
			`${settings.panelWidth}px`
		);
		this.containerElement.style.setProperty(
			"--floating-headings-panel-max-height",
			`${settings.panelMaxHeight}px`
		);
		this.containerElement.style.setProperty(
			"--floating-headings-animation-duration",
			`${settings.animationDuration}ms`
		);

		if (settings.panelBackgroundColor) {
			this.containerElement.style.setProperty(
				"--floating-headings-panel-bg",
				settings.panelBackgroundColor
			);
		}

		if (settings.collapsedLineColor) {
			this.containerElement.style.setProperty(
				"--floating-headings-line-color",
				settings.collapsedLineColor
			);
		}

		this.containerElement.style.setProperty(
			"--floating-headings-line-thickness",
			`${settings.lineThickness}px`
		);
	}
}
