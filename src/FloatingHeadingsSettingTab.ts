import { App, PluginSettingTab, Setting } from "obsidian";
import type FloatingHeadingsPlugin from "../main";
import { HeadingParser } from "./HeadingParser";
import { DEFAULT_SETTINGS } from "./types";

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
						this.plugin.handleEnableDisable();
					})
			);

		new Setting(containerEl)
			.setName("Enable filter")
			.setDesc(
				"Enable filter input to search headings in the expanded panel."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableFilter)
					.onChange(async (value) => {
						this.plugin.settings.enableFilter = value;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
					})
			);

		new Setting(containerEl)
			.setName("Hide panel on navigation")
			.setDesc(
				"Hide the expanded panel after clicking on a heading to navigate."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.hidePanelOnNavigation)
					.onChange(async (value) => {
						this.plugin.settings.hidePanelOnNavigation = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Vertical position")
			.setDesc("Vertical position of the sidebar (0%-100%).")
			.addSlider((slider) =>
				slider
					.setLimits(0, 100, 5)
					.setValue(this.plugin.settings.verticalPosition)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.verticalPosition = value;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
					})
			)
			.addExtraButton((button) =>
				button
					.setIcon("rotate-ccw")
					.setTooltip("Restore default")
					.onClick(async () => {
						this.plugin.settings.verticalPosition =
							DEFAULT_SETTINGS.verticalPosition;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
						this.display();
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
						this.plugin.clearCache();
						this.plugin.updateHeadings();
					})
			)
			.addExtraButton((button) =>
				button
					.setIcon("rotate-ccw")
					.setTooltip("Restore default")
					.onClick(async () => {
						this.plugin.settings.maxHeadingLevel =
							DEFAULT_SETTINGS.maxHeadingLevel;
						await this.plugin.saveSettings();
						this.plugin.clearCache();
						this.plugin.updateHeadings();
						this.display();
					})
			);

		new Setting(containerEl).setName("Appearance").setHeading();

		new Setting(containerEl)
			.setName("Panel max height")
			.setDesc("Maximum height of the panel in pixels.")
			.addSlider((slider) =>
				slider
					.setLimits(100, 800, 20)
					.setValue(this.plugin.settings.panelMaxHeight)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.panelMaxHeight = value;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
					})
			)
			.addExtraButton((button) =>
				button
					.setIcon("rotate-ccw")
					.setTooltip("Restore default")
					.onClick(async () => {
						this.plugin.settings.panelMaxHeight =
							DEFAULT_SETTINGS.panelMaxHeight;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
						this.display();
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
			)
			.addExtraButton((button) =>
				button
					.setIcon("rotate-ccw")
					.setTooltip("Restore default")
					.onClick(async () => {
						this.plugin.settings.panelWidth =
							DEFAULT_SETTINGS.panelWidth;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
						this.display();
					})
			);

		new Setting(containerEl)
			.setName("Panel scroll position")
			.setDesc("Scroll position of the expanded panel.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("top", "Set to top")
					.addOption("previous", "Previous scroll position")
					.addOption("closest", "Current header")
					.setValue(this.plugin.settings.panelScrollPosition)
					.onChange(async (value: "top" | "previous" | "closest") => {
						this.plugin.settings.panelScrollPosition = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Sidebar width")
			.setDesc("Width of the collapsed sidebar in pixels.")
			.addSlider((slider) =>
				slider
					.setLimits(8, 48, 2)
					.setValue(this.plugin.settings.collapsedWidth)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.collapsedWidth = value;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
					})
			)
			.addExtraButton((button) =>
				button
					.setIcon("rotate-ccw")
					.setTooltip("Restore default")
					.onClick(async () => {
						this.plugin.settings.collapsedWidth =
							DEFAULT_SETTINGS.collapsedWidth;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
						this.display();
					})
			);

		new Setting(containerEl)
			.setName("Sidebar line thickness")
			.setDesc("Thickness of the collapsed heading lines in pixels.")
			.addSlider((slider) =>
				slider
					.setLimits(1, 8, 1)
					.setValue(this.plugin.settings.lineThickness)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.lineThickness = value;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
					})
			)
			.addExtraButton((button) =>
				button
					.setIcon("rotate-ccw")
					.setTooltip("Restore default")
					.onClick(async () => {
						this.plugin.settings.lineThickness =
							DEFAULT_SETTINGS.lineThickness;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
						this.display();
					})
			);

		new Setting(containerEl)
			.setName("Animation duration")
			.setDesc("Duration of animations in milliseconds.")
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
			)
			.addExtraButton((button) =>
				button
					.setIcon("rotate-ccw")
					.setTooltip("Restore default")
					.onClick(async () => {
						this.plugin.settings.animationDuration =
							DEFAULT_SETTINGS.animationDuration;
						await this.plugin.saveSettings();
						this.plugin.ui?.refresh();
						this.display();
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
						// If HTML parsing enabled, disable custom regex
						if (value && this.plugin.settings.useCustomRegex) {
							this.plugin.settings.useCustomRegex = false;
						}
						await this.plugin.saveSettings();
						this.plugin.updateHeadings();
						this.display();
					})
			)
			.addExtraButton((button) =>
				button
					.setIcon("rotate-ccw")
					.setTooltip("Restore default")
					.onClick(async () => {
						this.plugin.settings.parseHtmlElements =
							DEFAULT_SETTINGS.parseHtmlElements;
						await this.plugin.saveSettings();
						this.plugin.updateHeadings();
						this.display();
					})
			);

		new Setting(containerEl)
			.setName("Use custom regex")
			.setDesc(
				"Enable custom regular expression for parsing headings instead of standard Markdown format."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useCustomRegex)
					.onChange(async (value) => {
						this.plugin.settings.useCustomRegex = value;
						// If custom regex enabled, disable HTML parsing
						if (value && this.plugin.settings.parseHtmlElements) {
							this.plugin.settings.parseHtmlElements = false;
						}
						if (
							value &&
							(!this.plugin.settings.customRegexPatterns ||
								this.plugin.settings.customRegexPatterns
									.length === 0)
						) {
							this.plugin.settings.customRegexPatterns = [""];
						}
						await this.plugin.saveSettings();
						this.plugin.updateHeadings();
						this.display();
					})
			)
			.addExtraButton((button) =>
				button
					.setIcon("rotate-ccw")
					.setTooltip("Restore default")
					.onClick(async () => {
						this.plugin.settings.useCustomRegex =
							DEFAULT_SETTINGS.useCustomRegex;
						this.plugin.settings.customRegexPatterns = [
							...DEFAULT_SETTINGS.customRegexPatterns,
						];
						await this.plugin.saveSettings();
						this.plugin.updateHeadings();
						this.display();
					})
			);

		if (this.plugin.settings.useCustomRegex) {
			new Setting(containerEl)
				.setName("Regex patterns")
				.setDesc(
					"Define multiple regex patterns to extract heading text."
				);

			this.renderRegexPatterns(containerEl);

			new Setting(containerEl)
				.setName("Add regex pattern")
				.addExtraButton((btn) =>
					btn
						.setIcon("plus")
						.setTooltip("Add new pattern")
						.onClick(async () => {
							this.plugin.settings.customRegexPatterns.push("");
							await this.plugin.saveSettings();
							this.display();
						})
				);
		}
	}

	private renderRegexPatterns(container: HTMLElement): void {
		this.plugin.settings.customRegexPatterns.forEach((pattern, index) => {
			new Setting(container)
				.setName(`Pattern ${index + 1}`)
				.addText((text) => {
					const updatePattern = async (value: string) => {
						this.plugin.settings.customRegexPatterns[index] = value;
						await this.plugin.saveSettings();
						this.plugin.updateHeadings();

						if (
							value.trim() === "" ||
							HeadingParser.isValidRegex(value)
						) {
							text.inputEl.classList.remove("invalid-regex");
						} else {
							text.inputEl.classList.add("invalid-regex");
						}
					};

					text.setValue(pattern).onChange(updatePattern);

					if (
						pattern.trim() !== "" &&
						!HeadingParser.isValidRegex(pattern)
					) {
						text.inputEl.classList.add("invalid-regex");
					}

					return text;
				})
				.addExtraButton((btn) =>
					btn
						.setIcon("trash")
						.setTooltip("Remove pattern")
						.onClick(async () => {
							this.plugin.settings.customRegexPatterns.splice(
								index,
								1
							);
							if (
								this.plugin.settings.customRegexPatterns
									.length === 0
							) {
								this.plugin.settings.customRegexPatterns = [""];
							}
							await this.plugin.saveSettings();
							this.plugin.updateHeadings();
							this.display();
						})
				);
		});
	}
}
