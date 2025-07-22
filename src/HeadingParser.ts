import { HeadingInfo } from "./types";
import { MarkdownView, HeadingCache } from "obsidian";
import type FloatingHeadingsPlugin from "../main";

export class HeadingParser {
	static getHeadingsFromCache(
		plugin: FloatingHeadingsPlugin,
		view: MarkdownView
	): HeadingInfo[] {
		const file = view?.file;
		if (!file) return [];

		const fileMetadata = plugin.app.metadataCache.getFileCache(file) || {};
		const fileHeadings: HeadingCache[] = fileMetadata.headings ?? [];

		return fileHeadings.map((heading) => {
			let displayText = heading.heading;

			displayText = this.processHeadingText(
				displayText,
				plugin.settings.parseHtmlElements,
				plugin.settings.useCustomRegex
			);

			return {
				text: displayText,
				level: heading.level,
				line: heading.position.start.line,
			};
		});
	}

	private static processHeadingText(
		text: string,
		parseHtml: boolean,
		useCustomRegex: boolean
	): string {
		// If custom regex is enabled, don't apply any cleaning
		if (useCustomRegex) {
			return text;
		}

		let processedText = text;

		// If HTML parsing is enabled, strip HTML tags first
		if (parseHtml) {
			processedText = this.stripHtmlTags(processedText);
		}

		// Always apply markdown cleaning (unless custom regex is used)
		processedText = this.cleanMarkdownFormatting(processedText);
		processedText = this.extractLinkText(processedText);

		return processedText;
	}

	private static stripHtmlTags(text: string): string {
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, "text/html");
		return doc.body.textContent || doc.body.innerText || text;
	}

	private static cleanMarkdownFormatting(text: string): string {
		return text
			.replace(/\*\*/g, "")
			.replace(/\*/g, "")
			.replace(/_/g, "")
			.replace(/`/g, "")
			.replace(/==/g, "")
			.replace(/~~/g, "");
	}

	private static extractLinkText(text: string): string {
		return text
			.replace(/\[(.*?)\]\(.*?\)/g, "$1")
			.replace(/\[\[([^\]]+)\|([^\]]+)\]\]/g, "$2")
			.replace(/\[\[([^\]]+)\]\]/g, "$1");
	}

	// Fallback method
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
				const parts = customRegex.match(/^\/(.+)\/([gimsuy]*)$/);
				if (parts) {
					regexPattern = new RegExp(parts[1], parts[2]);
				} else {
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

			// Skip code blocks
			if (trimmedLine.startsWith("```")) {
				inCodeBlock = !inCodeBlock;
				continue;
			}
			if (inCodeBlock) continue;

			if (trimmedLine.startsWith("`") && !trimmedLine.startsWith("```"))
				continue;
			if (line.startsWith("    ") || line.startsWith("\t")) continue;

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

					text = this.processHeadingText(
						text,
						parseHtml,
						useCustomRegex
					);
				}

				if (!text || text.length === 0) {
					text = trimmedLine;
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
		return headings.length <= maxCount
			? headings
			: headings.slice(0, maxCount);
	}

	static isValidRegex(pattern: string): boolean {
		try {
			new RegExp(pattern);
			return true;
		} catch {
			return false;
		}
	}

	static hasHeadingTextGroup(pattern: string): boolean {
		return pattern.includes("?<heading_text>");
	}
}
