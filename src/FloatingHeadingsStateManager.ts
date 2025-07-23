import { App, MarkdownView, WorkspaceLeaf, TFile } from "obsidian";
import { HeadingInfo, FloatingHeadingsSettings } from "./types";
import { HeadingParser } from "./HeadingParser";
import { FloatingHeadingsUIManager } from "./FloatingHeadingsUIManager";
import { CacheManager, TimeoutManager } from "./utilities";

export class FloatingHeadingsStateManager {
	private app: App;
	private settings: FloatingHeadingsSettings;
	private currentHeadings: HeadingInfo[] = [];
	private activeMarkdownView: MarkdownView | null = null;
	private currentMode: string | null = null;
	private headingsCache: CacheManager<HeadingInfo[]>;
	private timeoutManager: TimeoutManager;
	private ui: FloatingHeadingsUIManager;

	constructor(
		app: App,
		settings: FloatingHeadingsSettings,
		ui: FloatingHeadingsUIManager
	) {
		this.app = app;
		this.settings = settings;
		this.ui = ui;
		this.headingsCache = new CacheManager<HeadingInfo[]>(10, 1000);
		this.timeoutManager = new TimeoutManager();
	}

	handleActiveLeafChange(leaf: WorkspaceLeaf | null): void {
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
			this.updateHeadings();
			this.mountUI();
		} else {
			this.activeMarkdownView = null;
			this.currentMode = null;
		}
	}

	handleModeChange(): void {
		if (this.activeMarkdownView) {
			const newMode = this.activeMarkdownView.getMode?.() || null;
			if (newMode !== this.currentMode) {
				this.currentMode = newMode;
				this.updateHeadings();
			}
		}
	}

	handleEditorChange(): void {
		this.timeoutManager.set(
			"update",
			() => {
				this.headingsCache.clear();
				this.updateHeadings();
			},
			150
		);
	}

	handleFileModified(file: TFile): void {
		if (file === this.activeMarkdownView?.file) {
			this.timeoutManager.set(
				"fileUpdate",
				() => {
					this.headingsCache.clear();
					this.updateHeadings();
				},
				300
			);
		}
	}

	handleMetadataChanged(): void {
		if (this.activeMarkdownView) {
			this.headingsCache.clear();
			this.updateHeadings();
		}
	}

	updateHeadings(): void {
		if (!this.activeMarkdownView || !this.settings.enabled) {
			this.currentHeadings = [];
			return;
		}

		const file = this.activeMarkdownView.file;
		if (!file) return;

		const cacheKey = this.generateCacheKey(file);
		const cached = this.getCachedHeadings(cacheKey);

		if (cached) {
			this.currentHeadings = cached.headings;
			this.refreshUI();
			return;
		}

		if (this.shouldUseCustomRegex()) {
			this.processCustomRegexHeadings(file, cacheKey);
		} else {
			this.processStandardHeadings(file, cacheKey);
		}
	}

	mountUI(): void {
		if (!this.activeMarkdownView || !this.ui) return;

		const targetContainer = this.findTargetContainer();
		if (targetContainer) {
			this.ensureRelativePositioning(targetContainer);
			this.ui.mount(targetContainer);
		}
	}

	private generateCacheKey(file: TFile): string {
		return `${file.path}_${file.stat.mtime}`;
	}

	private getCachedHeadings(
		cacheKey: string
	): { headings: HeadingInfo[]; timestamp: number } | null {
		const cached = this.headingsCache.get(cacheKey);
		if (cached) {
			return { headings: cached, timestamp: Date.now() };
		}
		return null;
	}

	private shouldUseCustomRegex(): boolean {
		return (
			this.settings.useCustomRegex && Boolean(this.settings.customRegex)
		);
	}

	private async processCustomRegexHeadings(
		file: TFile,
		cacheKey: string
	): Promise<void> {
		try {
			const content = await this.app.vault.cachedRead(file);
			const headings = this.parseHeadingsFromContent(content);
			this.updateHeadingsState(headings, cacheKey);
		} catch (error) {
			console.error("Error reading file for custom regex:", error);
			this.fallbackToContentParsing();
		}
	}

	private processStandardHeadings(file: TFile, cacheKey: string): void {
		const metadataHeadings = HeadingParser.getHeadingsFromCache(
			{ app: this.app, settings: this.settings },
			this.activeMarkdownView!
		);

		if (metadataHeadings.length > 0) {
			const filteredHeadings = HeadingParser.filterHeadingsByLevel(
				metadataHeadings,
				this.settings.maxHeadingLevel
			);
			this.updateHeadingsState(filteredHeadings, cacheKey);
		} else {
			this.fallbackToContentParsing();
		}
	}

	private parseHeadingsFromContent(content: string): HeadingInfo[] {
		const allHeadings = HeadingParser.parseHeadings(
			content,
			this.settings.parseHtmlElements,
			this.settings.useCustomRegex,
			this.settings.customRegex
		);
		return HeadingParser.filterHeadingsByLevel(
			allHeadings,
			this.settings.maxHeadingLevel
		);
	}

	private updateHeadingsState(
		headings: HeadingInfo[],
		cacheKey: string
	): void {
		this.currentHeadings = headings;
		this.cacheHeadings(cacheKey, headings);
		this.refreshUI();
	}

	private cacheHeadings(cacheKey: string, headings: HeadingInfo[]): void {
		this.headingsCache.set(cacheKey, headings);
	}

	private fallbackToContentParsing(): void {
		const editor = this.activeMarkdownView?.editor;
		const file = this.activeMarkdownView?.file;

		if (editor) {
			const content = editor.getValue();
			const headings = this.parseHeadingsFromContent(content);
			this.currentHeadings = headings;
			this.refreshUI();
		} else if (file) {
			this.app.vault.cachedRead(file).then((content) => {
				const headings = this.parseHeadingsFromContent(content);
				this.currentHeadings = headings;
				this.refreshUI();
			});
		}
	}

	private findTargetContainer(): HTMLElement | null {
		if (!this.activeMarkdownView) return null;

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

		return targetContainer;
	}

	private ensureRelativePositioning(element: HTMLElement): void {
		const computedStyle = window.getComputedStyle(element);
		if (computedStyle.position === "static") {
			element.style.position = "relative";
		}
	}

	private refreshUI(): void {
		if (this.ui) {
			this.ui.refresh();
		}
	}

	private cleanupUI(): void {
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

	cleanup(): void {
		this.timeoutManager.clearAll();
		this.cleanupUI();
		this.headingsCache.clear();
	}
}
