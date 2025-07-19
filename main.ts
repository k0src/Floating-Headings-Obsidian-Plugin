import { Plugin, MarkdownView, WorkspaceLeaf, TFile } from "obsidian";

interface HeadingInfo {
	text: string;
	level: number; // heading level - #, ##, ###, etc
	line: number;
}

interface FloatingHeadingsSettings {
	enabled: boolean;
	maxHeadingsInCollapsed: number;
	collapsedLineColor: string;
	hoverColor: string;
	panelBackgroundColor: string;
	animationDuration: number;
	maxHeadingLevel: number;
	panelWidth: number;
	panelMaxHeight: number;
	collapsedWidth: number;
}

const DEFAULT_SETTINGS: FloatingHeadingsSettings = {
	enabled: true,
	maxHeadingsInCollapsed: 25,
	collapsedLineColor: "var(--text-muted)",
	hoverColor: "var(--text-accent)",
	panelBackgroundColor: "var(--background-primary)",
	animationDuration: 150,
	maxHeadingLevel: 6,
	panelWidth: 240,
	panelMaxHeight: 800,
	collapsedWidth: 16,
};

class HeadingParser {
	static parseHeadings(content: string): HeadingInfo[] {
		const lines = content.split("\n");
		const headings: HeadingInfo[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

			if (headingMatch) {
				const level = headingMatch[1].length;
				const text = headingMatch[2].trim();

				headings.push({
					text,
					level,
					line: i,
				});
			}
		}

		return headings;
	}

	static filterHeadingsByLevel(
		headings: HeadingInfo[],
		maxLevel: number
	): HeadingInfo[] {
		return headings.filter((heading) => heading.level <= maxLevel);
	}

	static limitHeadingsForCollapsed(
		headings: HeadingInfo[],
		maxCount: number
	): HeadingInfo[] {
		if (headings.length <= maxCount) {
			return headings;
		}

		return headings.slice(maxCount);
	}
}

class FloatingHeadingsUIManager {
	private plugin: FloatingHeadingsPlugin;
	private containerElement: HTMLElement | null = null;
	private collapsedSidebar: HTMLElement | null = null;
	private expandedPanel: HTMLElement | null = null;
	private isHovered: boolean = false;
	private hoverTimeout: number | null = null;

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

		this.updateCollapsedView();
		this.updateExpandedView();
	}

	private createContainer(): HTMLElement {
		const container = document.createElement("div");
		container.className = "floating-headings-container";

		container.style.position = "absolute";
		container.style.top = "50%";
		container.style.right = "10px";
		container.style.transform = "translateY(-50%)";
		container.style.zIndex = "1000";
		container.style.pointerEvents = "auto";

		return container;
	}

	private createCollapsedSidebar(): HTMLElement {
		const sidebar = document.createElement("div");
		sidebar.className = "floating-headings-collapsed";

		const settings = this.plugin.settings;
		sidebar.style.width = `${settings.collapsedWidth}px`;
		sidebar.style.opacity = "0.4";
		sidebar.style.transition = `all ${settings.animationDuration}ms ease-in-out`;
		sidebar.style.cursor = "pointer";
		sidebar.style.padding = "4px 0";

		sidebar.addEventListener("mouseenter", () => {
			this.onMouseEnter();
		});

		sidebar.addEventListener("mouseleave", () => {
			this.onMouseLeave();
		});

		return sidebar;
	}

	private createExpandedPanel(): HTMLElement {
		const panel = document.createElement("div");
		panel.className = "floating-headings-expanded";

		const settings = this.plugin.settings;
		panel.style.position = "absolute";
		panel.style.top = "0";
		panel.style.right = `${settings.collapsedWidth + 5}px`;
		panel.style.width = `${settings.panelWidth}px`;
		panel.style.maxHeight = `${settings.panelMaxHeight}px`;
		panel.style.backgroundColor = settings.panelBackgroundColor;
		panel.style.border = "1px solid var(--background-modifier-border)";
		panel.style.borderRadius = "6px";
		panel.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.15)";
		panel.style.overflowY = "auto";
		panel.style.padding = "8px 0";
		panel.style.opacity = "0";
		panel.style.transform = "scaleX(0)";
		panel.style.transformOrigin = "right center";
		panel.style.transition = `all ${settings.animationDuration}ms ease-in-out`;
		panel.style.pointerEvents = "none";
		panel.style.zIndex = "1001";

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

		this.collapsedSidebar.style.opacity = "0.9";

		this.expandedPanel.style.pointerEvents = "auto";
		this.expandedPanel.style.opacity = "1";
		this.expandedPanel.style.transform = "scaleX(1)";
	}

	private hideExpandedPanel() {
		if (!this.expandedPanel || !this.collapsedSidebar) return;

		this.collapsedSidebar.style.opacity = "0.4";

		this.expandedPanel.style.pointerEvents = "none";
		this.expandedPanel.style.opacity = "0";
		this.expandedPanel.style.transform = "scaleX(0)";
	}

	updateCollapsedView() {
		if (!this.collapsedSidebar) return;

		this.collapsedSidebar.innerHTML = "";

		const headings = this.plugin.getCurrentHeadings();
		const settings = this.plugin.settings;

		const limitedHeadings = HeadingParser.limitHeadingsForCollapsed(
			headings,
			settings.maxHeadingsInCollapsed
		);

		limitedHeadings.forEach((heading, index) => {
			const line = this.createHeadingLine(heading, index);
			this.collapsedSidebar!.appendChild(line);
		});
	}

	updateExpandedView() {
		if (!this.expandedPanel) return;

		this.expandedPanel.innerHTML = "";

		const headings = this.plugin.getCurrentHeadings();

		headings.forEach((heading, index) => {
			const item = this.createExpandedHeadingItem(heading, index);
			this.expandedPanel!.appendChild(item);
		});
	}

	private createExpandedHeadingItem(
		heading: HeadingInfo,
		index: number
	): HTMLElement {
		const item = document.createElement("div");
		item.className = "floating-heading-item";

		const settings = this.plugin.settings;
		const indent = (heading.level - 1) * 16;

		item.style.padding = "4px 12px";
		item.style.paddingLeft = `${indent}px`;
		item.style.cursor = "pointer";
		item.style.fontSize = "12px";
		item.style.lineHeight = "1.3";
		item.style.color = "var(--text-normal)";
		item.style.borderRadius = "3px";
		item.style.transition = `background-color ${settings.animationDuration}ms ease-in-out`;
		item.style.whiteSpace = "nowrap";
		item.style.overflow = "hidden";
		item.style.textOverflow = "ellipsis";

		item.textContent = heading.text;
		item.title = heading.text; // Tooltip

		item.addEventListener("mouseenter", () => {
			item.style.backgroundColor = "var(--background-modifier-hover)";
		});

		item.addEventListener("mouseleave", () => {
			item.style.backgroundColor = "transparent";
		});

		item.addEventListener("click", () => {
			this.scrollToHeading(heading);
		});

		return item;
	}

	private createHeadingLine(
		heading: HeadingInfo,
		index: number
	): HTMLElement {
		const line = document.createElement("div");
		line.className = "floating-heading-line";

		const settings = this.plugin.settings;
		const lineWidth = this.calculateLineWidth(heading.level);

		line.style.height = "2px";
		line.style.width = `${lineWidth}%`;
		line.style.backgroundColor = settings.collapsedLineColor;
		line.style.marginBottom = "4px";
		line.style.borderRadius = "1px";
		line.style.transition = `all ${settings.animationDuration}ms ease-in-out`;
		line.style.cursor = "pointer";

		line.addEventListener("click", () => {
			this.scrollToHeading(heading);
		});

		return line;
	}

	private calculateLineWidth(level: number): number {
		switch (level) {
			case 1:
				return 100;
			case 2:
				return 75;
			case 3:
				return 55;
			case 4:
				return 40;
			case 5:
				return 30;
			case 6:
				return 25;
			default:
				return 20;
		}
	}

	private scrollToHeading(heading: HeadingInfo) {
		const markdownView = this.plugin.getActiveMarkdownView();
		if (!markdownView) return;

		const editor = markdownView.editor;

		// editor mode
		if (editor) {
			editor.setCursor(heading.line, 0);
			editor.scrollIntoView(
				{
					from: { line: heading.line, ch: 0 },
					to: { line: heading.line, ch: 0 },
				},
				true
			);
		} else {
			// reading mode
			const readingView = markdownView.containerEl.querySelector(
				".markdown-reading-view"
			);
			if (readingView) {
				const headingSelectors = ["h1", "h2", "h3", "h4", "h5", "h6"];
				const headingElements = readingView.querySelectorAll(
					headingSelectors.join(", ")
				);

				for (let i = 0; i < headingElements.length; i++) {
					const element = headingElements[i];
					if (element.textContent?.trim() === heading.text) {
						element.scrollIntoView({
							behavior: "smooth",
							block: "center",
						});

						// highlight effect
						element.classList.add("floating-headings-highlight");
						setTimeout(() => {
							element.classList.remove(
								"floating-headings-highlight"
							);
						}, 1000);
						break;
					}
				}
			}
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
	}

	refresh() {
		this.updateCollapsedView();
		this.updateExpandedView();
	}
}

export default class FloatingHeadingsPlugin extends Plugin {
	settings: FloatingHeadingsSettings;
	private currentHeadings: HeadingInfo[] = [];
	private activeMarkdownView: MarkdownView | null = null;
	private ui: FloatingHeadingsUIManager;

	async onload() {
		await this.loadSettings();

		this.ui = new FloatingHeadingsUIManager(this);

		this.registerEvent(
			this.app.workspace.on(
				"active-leaf-change",
				this.onActiveLeafChange.bind(this)
			)
		);

		this.onActiveLeafChange(this.app.workspace.activeLeaf);
	}

	onunload() {
		this.cleanupUI();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private onActiveLeafChange(leaf: WorkspaceLeaf | null) {
		this.cleanupUI();

		if (!leaf || !this.settings.enabled) {
			this.activeMarkdownView = null;
			return;
		}

		const view = leaf.view;
		if (view instanceof MarkdownView) {
			this.activeMarkdownView = view;
			this.setupMarkdownViewListeners();
			this.updateHeadings();
			this.mountUI();
		} else {
			this.activeMarkdownView = null;
		}
	}

	private setupMarkdownViewListeners() {
		if (!this.activeMarkdownView) return;

		const editor = this.activeMarkdownView.editor;
		if (editor) {
			this.registerEvent(
				this.activeMarkdownView.app.workspace.on(
					"editor-change",
					this.onEditorChange.bind(this)
				)
			);
		}

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file === this.activeMarkdownView?.file) {
					this.onFileModified();
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				setTimeout(() => {
					this.mountUI();
				}, 100);
			})
		);
	}

	private onEditorChange() {
		clearTimeout((this as any).updateTimeout);
		(this as any).updateTimeout = setTimeout(() => {
			this.updateHeadings();
		}, 150);
	}

	private onFileModified() {
		clearTimeout((this as any).fileUpdateTimeout);
		(this as any).fileUpdateTimeout = setTimeout(() => {
			this.updateHeadings();
		}, 300);
	}

	private updateHeadings() {
		if (!this.activeMarkdownView || !this.settings.enabled) {
			this.currentHeadings = [];
			return;
		}

		let content = "";
		const editor = this.activeMarkdownView.editor;

		if (editor) {
			content = editor.getValue();
		} else {
			const file = this.activeMarkdownView.file;
			if (file) {
				this.app.vault.cachedRead(file).then((fileContent) => {
					content = fileContent;
					this.processHeadings(content);
				});
				return;
			}
		}

		this.processHeadings(content);
	}

	private processHeadings(content: string) {
		const allHeadings = HeadingParser.parseHeadings(content);
		const filteredHeadings = HeadingParser.filterHeadingsByLevel(
			allHeadings,
			this.settings.maxHeadingLevel
		);

		this.currentHeadings = filteredHeadings;

		if (this.ui) {
			this.ui.refresh();
		}
	}

	private mountUI() {
		if (!this.activeMarkdownView || !this.ui) return;

		let targetContainer: HTMLElement | null = null;
		targetContainer =
			this.activeMarkdownView.containerEl.querySelector(".cm-editor");

		if (!targetContainer) {
			targetContainer = this.activeMarkdownView.containerEl.querySelector(
				".markdown-reading-view"
			);
		}

		if (!targetContainer) {
			targetContainer =
				this.activeMarkdownView.containerEl.querySelector(
					".view-content"
				);
		}

		if (!targetContainer) {
			targetContainer = this.activeMarkdownView.containerEl;
		}

		if (targetContainer) {
			const computedStyle = window.getComputedStyle(targetContainer);
			if (computedStyle.position === "static") {
				(targetContainer as HTMLElement).style.position = "relative";
			}

			this.ui.mount(targetContainer as HTMLElement);
		}
	}

	private cleanupUI() {
		if (this.ui) {
			this.ui.cleanup();
		}
	}

	getCurrentHeadings(): HeadingInfo[] {
		return this.currentHeadings;
	}

	getActiveMarkdownView(): MarkdownView | null {
		return this.activeMarkdownView;
	}
}
