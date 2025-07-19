export interface HeadingInfo {
	text: string;
	level: number;
	line: number;
}

export interface FloatingHeadingsSettings {
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

export const DEFAULT_SETTINGS: FloatingHeadingsSettings = {
	enabled: true,
	maxHeadingsInCollapsed: 25,
	collapsedLineColor: "",
	hoverColor: "var(--text-accent)",
	panelBackgroundColor: "",
	animationDuration: 150,
	maxHeadingLevel: 6,
	panelWidth: 240,
	panelMaxHeight: 400,
	collapsedWidth: 16,
};
