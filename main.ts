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

	updateHeadings() {
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

		const isReadingMode =
			!this.activeMarkdownView.getMode ||
			this.activeMarkdownView.getMode() === "preview";

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
}
