import { Plugin, MarkdownView } from "obsidian";

import {
	HeadingInfo,
	FloatingHeadingsSettings,
	DEFAULT_SETTINGS,
} from "./src/types";
import { FloatingHeadingsUIManager } from "./src/FloatingHeadingsUIManager";
import { FloatingHeadingsSettingTab } from "./src/FloatingHeadingsSettingTab";
import { FloatingHeadingsStateManager } from "./src/FloatingHeadingsStateManager";
import { EventBinder } from "./src/EventBinder";

export default class FloatingHeadingsPlugin extends Plugin {
	settings: FloatingHeadingsSettings;
	private stateManager: FloatingHeadingsStateManager;
	private eventBinder: EventBinder;
	ui: FloatingHeadingsUIManager;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new FloatingHeadingsSettingTab(this.app, this));

		this.ui = new FloatingHeadingsUIManager(this);
		this.stateManager = new FloatingHeadingsStateManager(
			this.app,
			this.settings,
			this.ui
		);
		this.eventBinder = new EventBinder(this, this.stateManager);

		this.eventBinder.bindAllEvents();

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			this.stateManager.handleActiveLeafChange(activeView.leaf);
		}
	}

	onunload() {
		this.stateManager?.cleanup();
		this.eventBinder?.cleanup();
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

	updateHeadings() {
		this.stateManager?.updateHeadings();
	}

	handleEnableDisable() {
		if (this.settings.enabled) {
			// Re-initialize with current active view
			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				this.stateManager?.handleActiveLeafChange(activeView.leaf);
			}
		} else {
			// Clean up everything when disabled
			this.stateManager?.cleanup();
		}
	}

	getCurrentHeadings(): HeadingInfo[] {
		return this.stateManager?.getCurrentHeadings() || [];
	}

	getActiveMarkdownView(): MarkdownView | null {
		return this.stateManager?.getActiveMarkdownView() || null;
	}

	getCurrentMode(): string | null {
		return this.stateManager?.getCurrentMode() || null;
	}

	isReadingMode(): boolean {
		return this.stateManager?.isReadingMode() || false;
	}

	cleanupUI() {
		this.stateManager?.cleanup();
	}
}
