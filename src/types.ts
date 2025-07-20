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
	sidebarPosition: "left" | "right";
	maxHeadingLevel: number;
	panelWidth: number;
	panelMaxHeight: number;
	collapsedWidth: number;
	parseHtmlElements: boolean;
	useCustomRegex: boolean;
	customRegex: string;
}

export const DEFAULT_SETTINGS: FloatingHeadingsSettings = {
	enabled: true,
	maxHeadingsInCollapsed: 25,
	collapsedLineColor: "",
	hoverColor: "var(--text-accent)",
	panelBackgroundColor: "",
	animationDuration: 150,
	sidebarPosition: "right",
	maxHeadingLevel: 6,
	panelWidth: 240,
	panelMaxHeight: 400,
	collapsedWidth: 16,
	parseHtmlElements: false,
	useCustomRegex: false,
	customRegex: "^(#{1,6})\\s+(.+)$",
};
