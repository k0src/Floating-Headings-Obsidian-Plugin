import { Plugin, MarkdownView, WorkspaceLeaf, TFile } from "obsidian";

import {
	HeadingInfo,
	FloatingHeadingsSettings,
	DEFAULT_SETTINGS,
} from "./src/types";
import { HeadingParser } from "./src/HeadingParser";
import { FloatingHeadingsUIManager } from "./src/FloatingHeadingsUIManager";
import { FloatingHeadingsSettingTab } from "./src/FloatingHeadingsSettingTab";

export default class FloatingHeadingsPlugin extends Plugin {
	settings: FloatingHeadingsSettings;
	private currentHeadings: HeadingInfo[] = [];
	private activeMarkdownView: MarkdownView | null = null;
	private currentMode: string | null = null;
	private headingsCache: Map<
		string,
		{ headings: HeadingInfo[]; timestamp: number }
	> = new Map();
	ui: FloatingHeadingsUIManager;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new FloatingHeadingsSettingTab(this.app, this));

		this.ui = new FloatingHeadingsUIManager(this);

		this.registerEvent(
			this.app.workspace.on(
				"active-leaf-change",
				this.onActiveLeafChange.bind(this)
			)
		);

		this.registerEvent(
			this.app.metadataCache.on("changed", () => {
				this.handleMetadataChanged();
			})
		);

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			this.onActiveLeafChange(activeView.leaf);
		}
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

	onActiveLeafChange(leaf: WorkspaceLeaf | null) {
		this.cleanupUI();

		if (!leaf || !this.settings.enabled) {
			this.activeMarkdownView = null;
			this.currentMode = null;
			return;
		}

		const view = leaf.view;
		if (view instanceof MarkdownView) {
			this.activeMarkdownView = view;
			this.currentMode = view.getMode?.() || null;
			this.setupMarkdownViewListeners();
			this.updateHeadings();
			this.mountUI();
		} else {
			this.activeMarkdownView = null;
			this.currentMode = null;
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

		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				if (this.activeMarkdownView) {
					const newMode = this.activeMarkdownView.getMode?.() || null;
					if (newMode !== this.currentMode) {
						this.currentMode = newMode;
						this.updateHeadings();
					}
				}
			})
		);
	}

	private onEditorChange() {
		clearTimeout((this as any).updateTimeout);
		(this as any).updateTimeout = setTimeout(() => {
			this.headingsCache.clear();
			this.updateHeadings();
		}, 150);
	}

	private onFileModified() {
		clearTimeout((this as any).fileUpdateTimeout);
		(this as any).fileUpdateTimeout = setTimeout(() => {
			this.headingsCache.clear();
			this.updateHeadings();
		}, 300);
	}

	updateHeadings() {
		if (!this.activeMarkdownView || !this.settings.enabled) {
			this.currentHeadings = [];
			return;
		}

		const file = this.activeMarkdownView.file;
		if (!file) return;

		// Check cache first
		const cacheKey = file.path + "_" + file.stat.mtime;
		const cached = this.headingsCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < 1000) {
			// Cache for 1 second
			this.currentHeadings = cached.headings;
			if (this.ui) {
				this.ui.refresh();
			}
			return;
		}

		// Read content direactly If custom regex is enabled
		if (this.settings.useCustomRegex && this.settings.customRegex) {
			this.app.vault.cachedRead(file).then((content) => {
				this.processCustomRegexHeadings(content, cacheKey);
			});
			return;
		}

		// Use metadata cache for standard heading parsing
		const metadataHeadings = HeadingParser.getHeadingsFromCache(
			this,
			this.activeMarkdownView
		);

		if (metadataHeadings.length > 0) {
			const filteredHeadings = HeadingParser.filterHeadingsByLevel(
				metadataHeadings,
				this.settings.maxHeadingLevel
			);
			this.currentHeadings = filteredHeadings;

			this.headingsCache.set(cacheKey, {
				headings: filteredHeadings,
				timestamp: Date.now(),
			});
		} else {
			this.fallbackToContentParsing();
		}

		// Clean old cache entries
		if (this.headingsCache.size > 10) {
			const oldestKey = this.headingsCache.keys().next().value;
			this.headingsCache.delete(oldestKey);
		}

		if (this.ui) {
			this.ui.refresh();
		}
	}

	private processCustomRegexHeadings(content: string, cacheKey: string) {
		const allHeadings = HeadingParser.parseHeadings(
			content,
			this.settings.parseHtmlElements,
			this.settings.useCustomRegex,
			this.settings.customRegex
		);
		const filteredHeadings = HeadingParser.filterHeadingsByLevel(
			allHeadings,
			this.settings.maxHeadingLevel
		);

		this.currentHeadings = filteredHeadings;

		// Update cache
		this.headingsCache.set(cacheKey, {
			headings: filteredHeadings,
			timestamp: Date.now(),
		});

		// Clean old cache entries
		if (this.headingsCache.size > 10) {
			const oldestKey = this.headingsCache.keys().next().value;
			this.headingsCache.delete(oldestKey);
		}

		if (this.ui) {
			this.ui.refresh();
		}
	}

	private fallbackToContentParsing() {
		let content = "";
		const editor = this.activeMarkdownView?.editor;

		if (editor) {
			content = editor.getValue();
		} else {
			const file = this.activeMarkdownView?.file;
			if (file) {
				this.app.vault.cachedRead(file).then((fileContent) => {
					content = fileContent;
					this.processHeadingsFromContent(content);
				});
				return;
			}
		}

		this.processHeadingsFromContent(content);
	}

	private processHeadingsFromContent(content: string) {
		const allHeadings = HeadingParser.parseHeadings(
			content,
			this.settings.parseHtmlElements,
			this.settings.useCustomRegex,
			this.settings.customRegex
		);
		const filteredHeadings = HeadingParser.filterHeadingsByLevel(
			allHeadings,
			this.settings.maxHeadingLevel
		);

		this.currentHeadings = filteredHeadings;

		if (this.ui) {
			this.ui.refresh();
		}
	}

	private handleMetadataChanged() {
		if (this.activeMarkdownView) {
			this.headingsCache.clear();
			this.updateHeadings();
		}
	}

	private mountUI() {
		if (!this.activeMarkdownView || !this.ui) return;

		const isReadingMode = this.isReadingMode();

		let targetContainer: HTMLElement | null = null;

		if (isReadingMode) {
			targetContainer = this.activeMarkdownView.containerEl.querySelector(
				".markdown-reading-view"
			);
		} else {
			targetContainer =
				this.activeMarkdownView.containerEl.querySelector(".cm-editor");
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

	cleanupUI() {
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

	getCurrentMode(): string | null {
		return this.currentMode;
	}

	isReadingMode(): boolean {
		return this.currentMode === "preview" || !this.currentMode;
	}
}
