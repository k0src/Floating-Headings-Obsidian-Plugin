import { App, PluginSettingTab, Setting, MarkdownView } from "obsidian";
import type FloatingHeadingsPlugin from "../main";

export class FloatingHeadingsSettingTab extends PluginSettingTab {
	plugin: FloatingHeadingsPlugin;

	constructor(app: App, plugin: FloatingHeadingsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Enable plugin")
			.setDesc("Enable or disable the floating headings sidebar.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enabled)
					.onChange(async (value) => {
						this.plugin.settings.enabled = value;
						await this.plugin.saveSettings();
						if (value) {
							this.plugin.onActiveLeafChange(
								this.app.workspace.getActiveViewOfType(
									MarkdownView
								)?.leaf || null
							);
						} else {
							this.plugin.cleanupUI();
						}
					})
			);

		new Setting(containerEl)
			.setName("Maximum heading level")
			.setDesc("Only show headings up to this level (1-6).")
			.addSlider((slider) =>
				slider
					.setLimits(1, 6, 1)
					.setValue(this.plugin.settings.maxHeadingLevel)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxHeadingLevel = value;
						await this.plugin.saveSettings();
						this.plugin.updateHeadings();
					})
			);

		new Setting(containerEl)
			.setName("Panel width")
			.setDesc("Width of the expanded panel in pixels.")
			.addSlider((slider) =>
				slider
					.setLimits(180, 400, 10)
					.setValue(this.plugin.settings.panelWidth)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.panelWidth = value;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
					})
			);

		new Setting(containerEl)
			.setName("Panel max height")
			.setDesc("Maximum height of the panel in pixels.")
			.addSlider((slider) =>
				slider
					.setLimits(200, 800, 20)
					.setValue(this.plugin.settings.panelMaxHeight)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.panelMaxHeight = value;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
					})
			);

		new Setting(containerEl)
			.setName("Collapsed sidebar width")
			.setDesc("Width of the collapsed sidebar in pixels.")
			.addSlider((slider) =>
				slider
					.setLimits(8, 32, 2)
					.setValue(this.plugin.settings.collapsedWidth)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.collapsedWidth = value;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
					})
			);

		new Setting(containerEl)
			.setName("Animation duration")
			.setDesc("Duration of hover animations in milliseconds.")
			.addSlider((slider) =>
				slider
					.setLimits(50, 500, 25)
					.setValue(this.plugin.settings.animationDuration)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.animationDuration = value;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
					})
			);

		new Setting(containerEl)
			.setName("Line color")
			.setDesc("Color of the collapsed heading lines.")
			.addText((text) =>
				text
					.setPlaceholder("#DADADA")
					.setValue(this.plugin.settings.collapsedLineColor)
					.onChange(async (value) => {
						this.plugin.settings.collapsedLineColor =
							value || "var(--text-muted)";
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
					})
			);

		new Setting(containerEl)
			.setName("Panel background color")
			.setDesc("Background color of the expanded panel.")
			.addText((text) =>
				text
					.setPlaceholder("#1E1E1E")
					.setValue(this.plugin.settings.panelBackgroundColor)
					.onChange(async (value) => {
						this.plugin.settings.panelBackgroundColor =
							value || "var(--background-primary)";
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
					})
			);

		new Setting(containerEl).setName("Advanced").setHeading();

		new Setting(containerEl)
			.setName("Parse HTML elements")
			.setDesc(
				`Strip HTML tags from heading text to show clean text in the sidebar. (e.g. ### <span style="color:rgb(0, 149, 255)">A Heading</span> -> ### A Heading)`
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.parseHtmlElements)
					.onChange(async (value) => {
						this.plugin.settings.parseHtmlElements = value;
						await this.plugin.saveSettings();
						this.plugin.updateHeadings();
					})
			);
	}
}
