import { HeadingInfo } from "./types";

export class HeadingParser {
	static parseHeadings(
		content: string,
		parseHtml: boolean = false,
		useCustomRegex: boolean = false,
		customRegex?: string
	): HeadingInfo[] {
		const lines = content.split("\n");
		const headings: HeadingInfo[] = [];

		// Default regex pattern for markdown headings
		let regexPattern = /^(#{1,6})\s+(.+)$/m;

		if (useCustomRegex && customRegex) {
			try {
				// Support flags (e.g., "m", "i") if passed in customRegex
				// Example customRegex: "^(#{1,6})\\s+\\d+\\.\\s+(.*)$" with optional "m" flag
				const parts = customRegex.match(/^\/(.+)\/([gimsuy]*)$/);
				if (parts) {
					regexPattern = new RegExp(parts[1], parts[2]);
				} else {
					// If no delimiter-slash format, fallback to default "m" flag
					regexPattern = new RegExp(customRegex, "m");
				}
			} catch (error) {
				// Fallback
				regexPattern = /^(#{1,6})\s+(.+)$/m;
			}
		}

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			const headingMatch = line.match(regexPattern);

			if (headingMatch) {
				let level: number;
				let text: string;

				const captureGroups = headingMatch.slice(1);
				if (useCustomRegex && customRegex) {
					const levelGroup = captureGroups[0];

					if (levelGroup.includes("#")) {
						level = levelGroup.length;
					} else if (!isNaN(parseInt(levelGroup))) {
						level = parseInt(levelGroup);
					} else {
						level = 1;
					}

					// Use last group as heading text
					text = captureGroups[captureGroups.length - 1].trim();
				} else {
					// Default markdown parsing
					level = headingMatch[1].length;
					text = headingMatch[2].trim();
				}

				if (!text || text.length === 0) {
					text = line.trim();
				}

				if (parseHtml) {
					text = this.stripHtmlTags(text);
				}

				headings.push({
					text,
					level,
					line: i,
				});
			}
		}

		return headings;
	}

	static stripHtmlTags(text: string): string {
		// Use DOMParser for safer HTML parsing
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, "text/html");

		return doc.body.textContent || doc.body.innerText || text;
	}

	static filterHeadingsByLevel(
		headings: HeadingInfo[],
		maxLevel: number
	): HeadingInfo[] {
		return headings.filter((heading) => heading.level <= maxLevel);
	}

	static limitHeadingsForCollapsed(
		headings: HeadingInfo[],
		maxCount: number
	): HeadingInfo[] {
		if (headings.length <= maxCount) {
			return headings;
		}

		return headings.slice(0, maxCount);
	}

	static isValidRegex(pattern: string): boolean {
		try {
			new RegExp(pattern);
			return true;
		} catch (error) {
			return false;
		}
	}
}
