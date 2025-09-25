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
	private lastContentHash: string = "";
	private lastHeadingsHash: string = "";

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

		if (leaf.view instanceof MarkdownView) {
			this.activeMarkdownView = leaf.view;
			this.currentMode = leaf.view.getMode?.() || null;
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
				if (this.mightContainHeadingChanges()) {
					this.headingsCache.clear();
					this.updateHeadings();
				}
			},
			500
		);
	}

	handleFileModified(file: TFile): void {
		if (file === this.activeMarkdownView?.file) {
			this.timeoutManager.set(
				"fileUpdate",
				() => {
					if (this.mightContainHeadingChanges()) {
						this.headingsCache.clear();
						this.updateHeadings();
					}
				},
				800
			);
		}
	}

	private mightContainHeadingChanges(): boolean {
		const editor = this.activeMarkdownView?.editor;
		if (!editor) return true;

		const cursor = editor.getCursor();
		const lines = [
			cursor.line > 0 ? editor.getLine(cursor.line - 1) : "",
			editor.getLine(cursor.line),
			cursor.line < editor.lineCount() - 1
				? editor.getLine(cursor.line + 1)
				: "",
		];

		const headingPattern = /^\s*#{1,6}\s/;
		return lines.some((line) => headingPattern.test(line));
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

		const currentContentHash = this.generateContentHash(file);
		if (currentContentHash === this.lastContentHash) return;

		const cacheKey = this.generateCacheKey(file);
		const cached = this.getCachedHeadings(cacheKey);

		if (cached) {
			const headingsHash = this.hashHeadings(cached.headings);
			if (headingsHash === this.lastHeadingsHash) return;

			this.currentHeadings = cached.headings;
			this.lastHeadingsHash = headingsHash;
			this.refreshUI();
			return;
		}

		if (this.shouldUseCustomRegex()) {
			this.processCustomRegexHeadings(file, cacheKey);
		} else {
			this.processStandardHeadings(file, cacheKey);
		}

		this.lastContentHash = currentContentHash;
	}

	private generateContentHash(file: TFile): string {
		return `${file.stat.mtime}_${file.stat.size}`;
	}

	private hashHeadings(headings: HeadingInfo[]): string {
		return headings.map((h) => `${h.text}_${h.level}_${h.line}`).join("|");
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
		return `${file.path}_${file.stat.mtime}_${this.settings.maxHeadingLevel}`;
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
			this.settings.useCustomRegex &&
			this.settings.customRegexPatterns?.length > 0 &&
			this.settings.customRegexPatterns.some(
				(pattern) => pattern.trim() !== ""
			)
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
			this.settings.customRegexPatterns
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
		const headingsHash = this.hashHeadings(headings);
		if (headingsHash === this.lastHeadingsHash) return;

		this.currentHeadings = headings;
		this.lastHeadingsHash = headingsHash;
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

		const selectors = this.isReadingMode()
			? [".markdown-reading-view", ".view-content"]
			: [".cm-editor", ".view-content"];

		for (const selector of selectors) {
			const element =
				this.activeMarkdownView.containerEl.querySelector(selector);
			if (element) return element as HTMLElement;
		}

		return this.activeMarkdownView.containerEl;
	}

	private ensureRelativePositioning(element: HTMLElement): void {
		if (window.getComputedStyle(element).position === "static") {
			element.classList.add("relative-position");
		}
	}

	private refreshUI(): void {
		this.ui?.refresh();
	}

	private cleanupUI(): void {
		this.ui?.cleanup();
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

	clearCache(): void {
		this.headingsCache.clear();
		this.lastContentHash = "";
		this.lastHeadingsHash = "";
	}

	cleanup(): void {
		this.timeoutManager.clearAll();
		this.cleanupUI();
		this.clearCache();
	}
}
