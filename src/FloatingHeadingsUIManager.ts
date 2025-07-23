import { MarkdownView, setIcon } from "obsidian";
import { HeadingInfo } from "./types";
import { HeadingFinder, NavigationHelper, DOMHelper } from "./UIUtilities";
import type FloatingHeadingsPlugin from "../main";

export class FloatingHeadingsUIManager {
	private plugin: FloatingHeadingsPlugin;
	private containerElement: HTMLElement | null = null;
	private collapsedSidebar: HTMLElement | null = null;
	private expandedPanel: HTMLElement | null = null;
	private isHovered: boolean = false;
	private isExpanded: boolean = false;
	private hoverTimeout: number | null = null;

	private expandedItemHeight: number = 0;
	private expandedPadding: number = 0;

	private filterInput: HTMLInputElement | null = null;
	private filterContainer: HTMLElement | null = null;
	private filterQuery: string = "";
	private filteredHeadings: HeadingInfo[] = [];
	private isFiltering: boolean = false;

	constructor(plugin: FloatingHeadingsPlugin) {
		this.plugin = plugin;
	}

	mount(parentElement: HTMLElement) {
		this.cleanup();

		this.containerElement = this.createContainer();
		this.collapsedSidebar = this.createCollapsedSidebar();
		this.expandedPanel = this.createExpandedPanel();
		this.isExpanded = false;

		this.filterQuery = "";
		this.filteredHeadings = [];
		this.isFiltering = false;

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
		const container = DOMHelper.createDiv("floating-headings-container");

		if (this.plugin.settings.sidebarPosition === "left") {
			container.addClass("position-left");
		}

		return container;
	}

	private createCollapsedSidebar(): HTMLElement {
		const sidebar = DOMHelper.createDiv("floating-headings-collapsed");

		DOMHelper.addEventListeners(sidebar, {
			mouseenter: () => this.onMouseEnter(),
			mouseleave: () => this.onMouseLeave(),
		});

		return sidebar;
	}

	private createExpandedPanel(): HTMLElement {
		const panel = DOMHelper.createDiv("floating-headings-expanded");

		DOMHelper.addEventListeners(panel, {
			mouseenter: () => this.onMouseEnter(),
			mouseleave: () => this.onMouseLeave(),
		});

		if (this.plugin.settings.enableFilter) {
			const filterContainer = this.createFilterContainer();
			panel.appendChild(filterContainer);
		}

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

		const wasExpanded = this.isExpanded;

		this.collapsedSidebar.classList.add("hovered");
		this.expandedPanel.classList.add("visible");
		this.isExpanded = true;

		if (!wasExpanded) {
			this.updateExpandedView();
			this.updateActiveHeading();
			this.applyScrollPosition();
		}
	}

	private hideExpandedPanel() {
		if (!this.expandedPanel || !this.collapsedSidebar) return;

		if (
			this.containerElement &&
			this.containerElement.hasClass("no-transition")
		) {
			this.containerElement.removeClass("no-transition");
		}

		this.collapsedSidebar.classList.remove("hovered");
		this.expandedPanel.classList.remove("visible");
		this.isExpanded = false;

		if (this.filterInput) {
			this.filterInput.blur();
		}

		this.clearFilter();
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

		if (headings.length === 0) {
			this.collapsedSidebar.classList.add("hidden");
			return;
		}

		this.collapsedSidebar.classList.remove("hidden");

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

		const headingItems = this.expandedPanel.querySelectorAll(
			".floating-heading-item"
		);
		headingItems.forEach((item) => item.remove());

		const allHeadings = this.plugin.getCurrentHeadings();
		let headingsToShow = allHeadings;

		if (
			this.plugin.settings.enableFilter &&
			this.filterQuery &&
			this.isFiltering
		) {
			headingsToShow = this.filteredHeadings;
		}

		const dynamicLevels = this.calculateDynamicLevels(headingsToShow);

		headingsToShow.forEach((heading, index) => {
			const item = this.createExpandedHeadingItem(
				heading,
				index,
				dynamicLevels[index]
			);
			this.expandedPanel!.appendChild(item);
		});

		this.updateActiveHeading();
	}

	private calculateDynamicLevels(headings: HeadingInfo[]): number[] {
		if (headings.length === 0) return [];

		const uniqueLevels = Array.from(
			new Set(headings.map((h) => h.level))
		).sort((a, b) => a - b);

		const levelMapping = new Map<number, number>();
		uniqueLevels.forEach((originalLevel, index) => {
			levelMapping.set(originalLevel, index + 1);
		});

		return headings.map((heading) => levelMapping.get(heading.level) || 1);
	}

	private createExpandedHeadingItem(
		heading: HeadingInfo,
		index: number,
		dynamicLevel: number
	): HTMLElement {
		const item = DOMHelper.createDiv("floating-heading-item");

		DOMHelper.setElementAttributes(item, {
			"data-level": dynamicLevel.toString(),
			title: heading.text,
		});

		item.textContent = heading.text;

		DOMHelper.addEventListeners(item, {
			click: () => {
				this.handleHeadingClick(heading, index);
			},
		});

		return item;
	}

	private createHeadingLine(
		heading: HeadingInfo,
		index: number
	): HTMLElement {
		const line = DOMHelper.createDiv("floating-heading-line");

		DOMHelper.setElementAttributes(line, {
			"data-level": heading.level.toString(),
		});

		return line;
	}

	private async handleHeadingClick(
		heading: HeadingInfo,
		index: number
	): Promise<void> {
		const markdownView = this.plugin.getActiveMarkdownView();
		if (!markdownView) return;

		await NavigationHelper.scrollToHeading(markdownView, heading);
		this.setActiveHeading(index);

		if (this.plugin.settings.hidePanelOnNavigation) {
			this.hideExpandedPanel();
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
		const isReadingMode = this.plugin.isReadingMode();

		if (isReadingMode) {
			return HeadingFinder.findClosestHeadingInReadingMode(
				markdownView,
				headings
			);
		} else {
			return HeadingFinder.findClosestHeadingInEditMode(
				markdownView,
				headings
			);
		}
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
		this.isExpanded = false;

		this.filterInput = null;
		this.filterContainer = null;
		this.filterQuery = "";
		this.filteredHeadings = [];
		this.isFiltering = false;
	}

	refresh() {
		this.updateCSSProperties();
		if (this.containerElement && this.containerElement.parentElement) {
			const parent = this.containerElement.parentElement;
			this.cleanup();
			this.mount(parent);
		}
	}

	private createFilterContainer(): HTMLElement {
		const container = DOMHelper.createDiv(
			"floating-headings-filter-container"
		);

		const inputBox = DOMHelper.createDiv(
			"floating-headings-filter-input-box"
		);

		const searchIcon = DOMHelper.createDiv(
			"floating-headings-filter-icon search-icon"
		);
		setIcon(searchIcon, "search");

		this.filterInput = document.createElement("input");
		this.filterInput.type = "text";
		this.filterInput.placeholder = "Filter headings...";
		this.filterInput.className = "floating-headings-filter-input";

		const clearIcon = DOMHelper.createDiv(
			"floating-headings-filter-icon clear-icon hidden"
		);
		setIcon(clearIcon, "x");

		DOMHelper.addEventListeners(this.filterInput, {
			input: (e) =>
				this.onFilterInput((e.target as HTMLInputElement).value),
			keydown: (e) => this.onFilterKeydown(e as KeyboardEvent),
		});

		DOMHelper.addEventListeners(clearIcon, {
			click: () => this.clearFilter(),
		});

		inputBox.appendChild(searchIcon);
		inputBox.appendChild(this.filterInput);
		inputBox.appendChild(clearIcon);
		container.appendChild(inputBox);

		this.filterContainer = container;
		return container;
	}

	private onFilterInput(value: string) {
		this.filterQuery = value.trim().toLowerCase();
		const clearIcon = this.filterContainer?.querySelector(
			".clear-icon"
		) as HTMLElement;

		this.isFiltering = Boolean(this.filterQuery);

		if (this.filterQuery) {
			clearIcon?.removeClass("hidden");
		} else {
			clearIcon?.addClass("hidden");
		}

		this.applyFilter();
	}

	private onFilterKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			this.clearFilter();
		}
	}

	private applyFilter() {
		const allHeadings = this.plugin.getCurrentHeadings();

		if (!this.filterQuery) {
			this.filteredHeadings = [];
		} else {
			this.filteredHeadings = allHeadings.filter((heading) =>
				heading.text.toLowerCase().includes(this.filterQuery)
			);
		}

		if (this.isExpanded) {
			this.updateExpandedView();
		}

		this.updatePanelPinning();
	}

	private updatePanelPinning() {
		if (!this.containerElement) return;

		if (this.isFiltering) {
			this.containerElement.addClass("filtering");
			this.containerElement.addClass("no-transition");
		} else {
			this.containerElement.removeClass("filtering");

			requestAnimationFrame(() => {
				if (this.containerElement) {
					this.containerElement.removeClass("no-transition");
				}
			});
		}
	}

	private clearFilter() {
		if (this.filterInput) {
			this.filterInput.value = "";
			this.filterQuery = "";
			this.filteredHeadings = [];
			this.isFiltering = false;

			const clearIcon = this.filterContainer?.querySelector(
				".clear-icon"
			) as HTMLElement;
			clearIcon?.addClass("hidden");

			if (!this.isExpanded) {
				setTimeout(() => {
					this.updatePanelPinning();
				}, this.plugin.settings.animationDuration);
			} else {
				this.applyFilter();
			}
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
		this.containerElement.style.setProperty(
			"--floating-headings-vertical-position",
			`${100 - settings.verticalPosition}%`
		);

		this.containerElement.style.setProperty(
			"--floating-headings-line-thickness",
			`${settings.lineThickness}px`
		);
	}
}
