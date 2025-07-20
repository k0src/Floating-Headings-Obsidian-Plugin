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
		let inCodeBlock = false;

		// Default regex pattern for markdown headings
		let regexPattern = /^(#{1,6})\s+(.+)$/;

		if (useCustomRegex && customRegex) {
			try {
				// Support flags (e.g., "g", "i", "m") if passed in customRegex
				// Example customRegex: "/^(#{1,6})\\s+\\d+\\.\\s+(.*)$/gm" with flags
				const parts = customRegex.match(/^\/(.+)\/([gimsuy]*)$/);
				if (parts) {
					regexPattern = new RegExp(parts[1], parts[2]);
				} else {
					// If no delimiter-slash format, use pattern as-is without default flags
					regexPattern = new RegExp(customRegex);
				}
			} catch (error) {
				// Fallback to default pattern
				regexPattern = /^(#{1,6})\s+(.+)$/;
			}
		}

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmedLine = line.trim();

			if (trimmedLine.startsWith("```")) {
				inCodeBlock = !inCodeBlock;
				continue;
			}

			if (inCodeBlock) {
				continue;
			}

			if (trimmedLine.startsWith("`") && !trimmedLine.startsWith("```")) {
				continue;
			}

			if (line.startsWith("    ") || line.startsWith("\t")) {
				continue;
			}

			const headingMatch = trimmedLine.match(regexPattern);

			if (headingMatch) {
				let level: number;
				let text: string;

				if (useCustomRegex && customRegex) {
					const captureGroups = headingMatch.slice(1);

					// Use named group "heading_text" if available
					if (
						headingMatch.groups &&
						headingMatch.groups.heading_text
					) {
						text = headingMatch.groups.heading_text.trim();
					} else {
						// Fallback to last capture group
						text = captureGroups[captureGroups.length - 1].trim();
					}

					// Determine level from first capture group
					const levelGroup = captureGroups[0];
					if (levelGroup.includes("#")) {
						level = levelGroup.length;
					} else if (!isNaN(parseInt(levelGroup))) {
						level = parseInt(levelGroup);
					} else {
						level = 1;
					}
				} else {
					// Default markdown parsing
					level = headingMatch[1].length;
					text = headingMatch[2].trim();
				}

				if (!text || text.length === 0) {
					text = trimmedLine;
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
			const regex = new RegExp(pattern);
			// Test if the regex is syntactically valid
			regex.test("test string");
			return true;
		} catch (error) {
			return false;
		}
	}

	static hasHeadingTextGroup(pattern: string): boolean {
		try {
			// Check if the pattern contains a named group "heading_text"
			return pattern.includes("?<heading_text>");
		} catch (error) {
			return false;
		}
	}
}
