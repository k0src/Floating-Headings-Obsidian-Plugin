export interface HeadingInfo {
	text: string;
	level: number;
	line: number;
}

export interface FloatingHeadingsSettings {
	enabled: boolean;
	verticalPosition: number;
	maxHeadingsInCollapsed: number;
	hoverColor: string;
	animationDuration: number;
	sidebarPosition: "left" | "right";
	maxHeadingLevel: number;
	panelWidth: number;
	panelMaxHeight: number;
	collapsedWidth: number;
	lineThickness: number;
	panelScrollPosition: "top" | "previous" | "closest";
	parseHtmlElements: boolean;
	useCustomRegex: boolean;
	customRegexPatterns: string[];
	hidePanelOnNavigation: boolean;
	enableFilter: boolean;
}

export const DEFAULT_SETTINGS: FloatingHeadingsSettings = {
	enabled: true,
	verticalPosition: 50,
	maxHeadingsInCollapsed: 25,
	hoverColor: "var(--text-accent)",
	animationDuration: 150,
	sidebarPosition: "right",
	maxHeadingLevel: 6,
	panelWidth: 240,
	panelMaxHeight: 400,
	collapsedWidth: 16,
	lineThickness: 2,
	panelScrollPosition: "previous",
	parseHtmlElements: false,
	useCustomRegex: false,
	customRegexPatterns: [""],
	hidePanelOnNavigation: false,
	enableFilter: false,
};
