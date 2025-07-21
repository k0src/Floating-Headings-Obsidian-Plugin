export interface HeadingInfo {
	text: string;
	level: number;
	line: number;
}

export interface FloatingHeadingsSettings {
	enabled: boolean;
	verticalPosition: number;
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
	lineThickness: number;
	panelScrollPosition: "top" | "previous" | "closest";
	parseHtmlElements: boolean;
	useCustomRegex: boolean;
	customRegex: string;
}

export const DEFAULT_SETTINGS: FloatingHeadingsSettings = {
	enabled: true,
	verticalPosition: 50,
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
	lineThickness: 3,
	panelScrollPosition: "previous",
	parseHtmlElements: false,
	useCustomRegex: false,
	//prettier-ignore
	customRegex: "/^(#{1,6})\s+(.+)$/m",
};
