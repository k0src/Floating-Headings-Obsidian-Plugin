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
	private isLocked: boolean = false;

	private expandedItemHeight: number = 0;
	private expandedPadding: number = 0;

	private filterInput: HTMLInputElement | null = null;
	private filterContainer: HTMLElement | null = null;
	private filterQuery: string = "";
	private filteredHeadings: HeadingInfo[] = [];
	private isFiltering: boolean = false;

	private collapsedHeadings: Set<string> = new Set();

	private lastRenderedCollapsedHeadings: HeadingInfo[] = [];
	private lastRenderedExpandedHeadings: HeadingInfo[] = [];
	private lastCollapsedHeight: string = "";
	private currentSettingsClasses: string[] = [];

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

		this.loadCollapsedState();
		this.applySettingsClasses();
		this.calculateDimensionsFromStyles();
		this.updateCollapsedView();
	}

	private calculateDimensionsFromStyles() {
		if (!this.containerElement) return;

		const styles = getComputedStyle(this.containerElement);
		const size22 = parseFloat(styles.getPropertyValue("--size-2-2")) || 4;
		const size42 = parseFloat(styles.getPropertyValue("--size-4-2")) || 8;
		const fontSize =
			parseFloat(styles.getPropertyValue("--font-ui-smaller")) || 12;
		const lineHeight =
			parseFloat(styles.getPropertyValue("--line-height-tight")) || 1.3;

		this.expandedItemHeight = size22 * 2 + fontSize * lineHeight;
		this.expandedPadding = size42 * 2;
	}

	private applySettingsClasses(): void {
		if (!this.containerElement) return;

		const settings = this.plugin.settings;

		this.currentSettingsClasses.forEach((className) => {
			this.containerElement?.removeClass(className);
		});
		this.currentSettingsClasses = [];

		const newClasses: string[] = [
			`fh-vpos-${settings.verticalPosition}`,
			`fh-max-height-${settings.panelMaxHeight}`,
			`fh-panel-width-${settings.panelWidth}`,
			`fh-collapsed-width-${settings.collapsedWidth}`,
			`fh-line-thickness-${settings.lineThickness}`,
			`fh-anim-${settings.animationDuration}`,
		];

		newClasses.forEach((className) => {
			this.containerElement?.addClass(className);
		});

		this.currentSettingsClasses = newClasses;
	}

	private setCollapsedHeight(height: string): void {
		if (!this.containerElement) return;

		this.containerElement.style.setProperty(
			"--floating-headings-collapsed-height",
			height
		);
	}

	private createContainer(): HTMLElement {
		const container = DOMHelper.createDiv("floating-headings-container");

		if (this.plugin.settings.sidebarPosition === "left") {
			container.classList.add("position-left");
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
		if (this.isLocked) return;

		this.isHovered = true;

		if (this.hoverTimeout) {
			clearTimeout(this.hoverTimeout);
			this.hoverTimeout = null;
		}

		this.showExpandedPanel();
	}

	private onMouseLeave() {
		if (this.isLocked) return;

		this.hoverTimeout = window.setTimeout(() => {
			this.isHovered = false;
			this.hideExpandedPanel();
		}, 50);
	}

	private showExpandedPanel() {
		if (!this.expandedPanel || !this.collapsedSidebar) return;

		const wasExpanded = this.isExpanded;

		this.collapsedSidebar.classList.add("hovered");
		this.expandedPanel.classList.add("visible");
		this.isExpanded = true;

		if (!wasExpanded) {
			this.lastRenderedExpandedHeadings = [];
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
			this.containerElement.classList.remove("no-transition");
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
		if (!this.collapsedSidebar || !this.containerElement) return;

		const headings = this.plugin.getCurrentHeadings();
		if (headings.length === 0) {
			this.collapsedSidebar.classList.add("hidden");
			return;
		}

		this.collapsedSidebar.classList.remove("hidden");

		const maxHeight = this.plugin.settings.panelMaxHeight;
		const maxLines = Math.floor((maxHeight - 8) / 9);
		const fittingHeadings = headings.slice(0, maxLines);
		const panelHeight = Math.min(
			headings.length * this.expandedItemHeight + this.expandedPadding,
			maxHeight
		);
		const newHeight = `${panelHeight}px`;

		if (
			newHeight !== this.lastCollapsedHeight ||
			!this.areHeadingsEqual(
				this.lastRenderedCollapsedHeadings,
				fittingHeadings
			)
		) {
			this.setCollapsedHeight(newHeight);
			this.lastCollapsedHeight = newHeight;

			this.collapsedSidebar.empty();
			fittingHeadings.forEach((heading, index) => {
				this.collapsedSidebar!.appendChild(
					this.createHeadingLine(heading, index)
				);
			});

			this.lastRenderedCollapsedHeadings = [...fittingHeadings];
		}
	}

	private areHeadingsEqual(
		headings1: HeadingInfo[],
		headings2: HeadingInfo[]
	): boolean {
		if (headings1.length !== headings2.length) return false;
		for (let i = 0; i < headings1.length; i++) {
			const h1 = headings1[i],
				h2 = headings2[i];
			if (
				h1.text !== h2.text ||
				h1.level !== h2.level ||
				h1.line !== h2.line
			)
				return false;
		}
		return true;
	}

	updateExpandedView() {
		if (!this.expandedPanel) return;

		const allHeadings = this.plugin.getCurrentHeadings();
		const headingsToShow =
			this.plugin.settings.enableFilter &&
			this.filterQuery &&
			this.isFiltering
				? this.filteredHeadings
				: allHeadings;

		if (
			this.isExpanded &&
			!this.isFiltering &&
			this.lastRenderedExpandedHeadings.length > 0 &&
			this.areHeadingsEqual(
				this.lastRenderedExpandedHeadings,
				headingsToShow
			)
		) {
			this.updateActiveHeading();
			return;
		}

		this.expandedPanel
			.querySelectorAll(".floating-heading-item")
			.forEach((item) => item.remove());

		const dynamicLevels = this.calculateDynamicLevels(headingsToShow);
		const headingIndexMap = new Map<string, number>();
		allHeadings.forEach((h, idx) =>
			headingIndexMap.set(`${h.text}_${h.line}_${h.level}`, idx)
		);

		const fragment = document.createDocumentFragment();
		headingsToShow.forEach((heading, index) => {
			const originalIndex =
				headingIndexMap.get(
					`${heading.text}_${heading.line}_${heading.level}`
				) ?? index;
			const hasChildren = this.doesHeadingHaveChildren(
				headingsToShow,
				index,
				dynamicLevels
			);
			fragment.appendChild(
				this.createExpandedHeadingItem(
					heading,
					originalIndex,
					dynamicLevels[index],
					hasChildren
				)
			);
		});

		this.expandedPanel.appendChild(fragment);
		this.applyInitialCollapsedStates();
		this.updateActiveHeading();
		this.lastRenderedExpandedHeadings = [...headingsToShow];
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

	private doesHeadingHaveChildren(
		headings: HeadingInfo[],
		currentIndex: number,
		dynamicLevels: number[]
	): boolean {
		const currentLevel = dynamicLevels[currentIndex];
		for (let i = currentIndex + 1; i < headings.length; i++) {
			const nextLevel = dynamicLevels[i];
			if (nextLevel <= currentLevel) return false;
			if (nextLevel > currentLevel) return true;
		}
		return false;
	}

	private applyInitialCollapsedStates(): void {
		if (!this.expandedPanel) return;

		const items = this.expandedPanel.querySelectorAll(
			".floating-heading-item"
		) as NodeListOf<HTMLElement>;

		items.forEach((item) => {
			const isCollapsed = item.classList.contains("collapsed");
			if (isCollapsed) {
				const parentLevel = parseInt(item.dataset.level || "0");
				let currentElement =
					item.nextElementSibling as HTMLElement | null;

				while (
					currentElement &&
					currentElement.classList.contains("floating-heading-item")
				) {
					const currentLevel = parseInt(
						currentElement.dataset.level || "0"
					);
					if (currentLevel <= parentLevel) {
						break;
					}
					currentElement.classList.add("collapsed-hidden");
					currentElement =
						currentElement.nextElementSibling as HTMLElement | null;
				}
			}
		});
	}

	private getHeadingId(heading: HeadingInfo, index: number): string {
		return `${heading.text}-${heading.line}-${heading.level}-${index}`;
	}

	private handleCollapseToggle(
		event: MouseEvent,
		heading: HeadingInfo,
		index: number
	): void {
		event.stopPropagation();

		const iconElement = event.currentTarget as HTMLElement;
		const headingItem = iconElement.closest(
			".floating-heading-item"
		) as HTMLElement;
		if (!headingItem) return;

		const parentLevel: number = parseInt(headingItem.dataset.level || "0");
		const isCollapsing = !headingItem.classList.contains("collapsed");

		headingItem.classList.toggle("collapsed");
		iconElement.classList.toggle("collapsed");

		const headingId = this.getHeadingId(heading, index);
		if (isCollapsing) {
			this.collapsedHeadings.add(headingId);
		} else {
			this.collapsedHeadings.delete(headingId);
		}
		this.saveCollapsedState();

		const elementsToProcess: HTMLElement[] = [];
		let currentElement: HTMLElement | null =
			headingItem.nextElementSibling as HTMLElement | null;

		while (
			currentElement &&
			currentElement.classList.contains("floating-heading-item")
		) {
			const currentLevel: number = parseInt(
				currentElement.dataset.level || "0"
			);
			if (currentLevel <= parentLevel) {
				break;
			}
			elementsToProcess.push(currentElement);
			currentElement =
				currentElement.nextElementSibling as HTMLElement | null;
		}

		requestAnimationFrame(() => {
			let visibilityDepthLimit = isCollapsing ? -1 : parentLevel + 1;

			elementsToProcess.forEach((el) => {
				const currentLevel = parseInt(el.dataset.level || "0");

				if (isCollapsing) {
					el.classList.add("collapsed-hidden");
				} else {
					if (currentLevel <= visibilityDepthLimit) {
						el.classList.remove("collapsed-hidden");
						visibilityDepthLimit = el.classList.contains(
							"collapsed"
						)
							? currentLevel
							: currentLevel + 1;
					} else {
						el.classList.add("collapsed-hidden");
					}
				}
			});
		});
	}

	private createExpandedHeadingItem(
		heading: HeadingInfo,
		index: number,
		dynamicLevel: number,
		hasChildren: boolean
	): HTMLElement {
		const item = DOMHelper.createDiv("floating-heading-item");

		DOMHelper.setElementAttributes(item, {
			"data-level": dynamicLevel.toString(),
			title: heading.text,
		});

		const content = DOMHelper.createDiv("floating-heading-content");

		if (hasChildren) {
			item.classList.add("has-collapse-icon");

			const collapseIcon = DOMHelper.createDiv(
				"floating-heading-collapse-icon"
			);
			const headingId = this.getHeadingId(heading, index);
			const isCollapsed = this.collapsedHeadings.has(headingId);

			if (isCollapsed) {
				collapseIcon.classList.add("collapsed");
				item.classList.add("collapsed");
			}

			setIcon(collapseIcon, "chevron-down");

			DOMHelper.addEventListeners(collapseIcon, {
				click: (e) => {
					e.stopPropagation();
					this.handleCollapseToggle(e as MouseEvent, heading, index);
				},
			});

			content.appendChild(collapseIcon);
		}

		const textSpan = document.createElement("span");
		textSpan.className = "floating-heading-text";
		textSpan.textContent = heading.text;
		content.appendChild(textSpan);

		item.appendChild(content);

		DOMHelper.addEventListeners(item, {
			click: () => {
				void this.handleHeadingClick(heading, index);
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

	togglePanelLock() {
		this.isLocked = !this.isLocked;

		if (this.isLocked) {
			if (!this.isExpanded) {
				this.showExpandedPanel();
			}
			if (this.hoverTimeout) {
				clearTimeout(this.hoverTimeout);
				this.hoverTimeout = null;
			}
		} else {
			if (!this.isHovered) {
				this.hideExpandedPanel();
			}
		}
	}

	private loadCollapsedState(): void {
		const saved = this.plugin.app.loadLocalStorage(
			"floating-headings-collapsed-state"
		);
		if (saved) {
			try {
				const collapsedArray = JSON.parse(saved);
				this.collapsedHeadings = new Set(collapsedArray);
			} catch (error) {
				console.warn("Failed to load collapsed headings state:", error);
				this.collapsedHeadings = new Set();
			}
		}
	}

	private saveCollapsedState(): void {
		try {
			const collapsedArray = Array.from(this.collapsedHeadings);
			this.plugin.app.saveLocalStorage(
				"floating-headings-collapsed-state",
				JSON.stringify(collapsedArray)
			);
		} catch (error) {
			console.warn("Failed to save collapsed headings state:", error);
		}
	}

	cleanup() {
		if (this.hoverTimeout) {
			clearTimeout(this.hoverTimeout);
			this.hoverTimeout = null;
		}

		if (this.containerElement) {
			this.containerElement.remove();
		}

		this.containerElement = null;
		this.collapsedSidebar = null;
		this.expandedPanel = null;
		this.filterInput = null;
		this.filterContainer = null;
		this.filterQuery = "";
		this.filteredHeadings = [];
		this.collapsedHeadings.clear();
		this.lastRenderedCollapsedHeadings = [];
		this.lastRenderedExpandedHeadings = [];
		this.lastCollapsedHeight = "";
	}
	refresh() {
		this.applySettingsClasses();
		this.updateContainerPosition();
		if (!this.containerElement?.parentElement) return;

		this.calculateDimensionsFromStyles();
		this.updateExpandedPanelStructure();
		this.updateCollapsedView();
		if (this.isExpanded) {
			this.updateExpandedView();
		}
	}

	private updateExpandedPanelStructure(): void {
		if (!this.expandedPanel) return;

		const hasFilter = !!this.expandedPanel.querySelector(
			".floating-headings-filter-container"
		);
		const shouldHaveFilter = this.plugin.settings.enableFilter;

		if (hasFilter && !shouldHaveFilter) {
			this.expandedPanel
				.querySelector(".floating-headings-filter-container")
				?.remove();
			this.filterInput = null;
			this.filterContainer = null;
			this.clearFilter();
		} else if (!hasFilter && shouldHaveFilter) {
			this.expandedPanel.insertBefore(
				this.createFilterContainer(),
				this.expandedPanel.firstChild
			);
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
		const clearIcon = this.filterContainer?.querySelector(".clear-icon");

		this.isFiltering = Boolean(this.filterQuery);

		if (this.filterQuery) {
			clearIcon?.classList.remove("hidden");
		} else {
			clearIcon?.classList.add("hidden");
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
	}

	private clearFilter() {
		if (this.filterInput) {
			this.filterInput.value = "";
			this.filterQuery = "";
			this.filteredHeadings = [];
			this.isFiltering = false;

			const clearIcon =
				this.filterContainer?.querySelector(".clear-icon");
			clearIcon?.classList.add("hidden");

			if (this.isExpanded) {
				this.applyFilter();
			}
		}
	}

	private updateContainerPosition() {
		if (!this.containerElement) return;

		const settings = this.plugin.settings;

		this.containerElement.classList.toggle(
			"position-left",
			settings.sidebarPosition === "left"
		);
	}
}
