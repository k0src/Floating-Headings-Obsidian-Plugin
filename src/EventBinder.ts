import { Plugin, TFile, WorkspaceLeaf } from "obsidian";

interface StateManager {
	handleActiveLeafChange(leaf: WorkspaceLeaf | null): void;
	handleModeChange(): void;
	handleEditorChange(): void;
	handleFileModified(file: TFile): void;
	handleMetadataChanged(): void;
	mountUI(): void;
}

export class EventBinder {
	private plugin: Plugin;
	private stateManager: StateManager;

	constructor(plugin: Plugin, stateManager: StateManager) {
		this.plugin = plugin;
		this.stateManager = stateManager;
	}

	bindAllEvents(): void {
		this.bindWorkspaceEvents();
		this.bindMetadataEvents();
		this.bindActiveViewEvents();
	}

	private bindWorkspaceEvents(): void {
		const leafChangeRef = this.plugin.app.workspace.on(
			"active-leaf-change",
			this.stateManager.handleActiveLeafChange.bind(this.stateManager),
		);
		this.plugin.registerEvent(leafChangeRef);

		const layoutChangeRef = this.plugin.app.workspace.on(
			"layout-change",
			() => {
				setTimeout(() => {
					this.stateManager.mountUI();
				}, 100);
			},
		);
		this.plugin.registerEvent(layoutChangeRef);

		const modeChangeRef = this.plugin.app.workspace.on(
			"layout-change",
			this.stateManager.handleModeChange.bind(this.stateManager),
		);
		this.plugin.registerEvent(modeChangeRef);
	}

	private bindMetadataEvents(): void {
		const metadataRef = this.plugin.app.metadataCache.on(
			"changed",
			this.stateManager.handleMetadataChanged.bind(this.stateManager),
		);
		this.plugin.registerEvent(metadataRef);
	}

	private bindActiveViewEvents(): void {
		const editorChangeRef = this.plugin.app.workspace.on(
			"editor-change",
			this.stateManager.handleEditorChange.bind(this.stateManager),
		);
		this.plugin.registerEvent(editorChangeRef);

		const fileModifyRef = this.plugin.app.vault.on(
			"modify",
			(file: TFile) => {
				this.stateManager.handleFileModified(file);
			},
		);
		this.plugin.registerEvent(fileModifyRef);
	}
}
