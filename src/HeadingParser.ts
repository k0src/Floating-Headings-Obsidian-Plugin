import { HeadingInfo } from "./types";

export class HeadingParser {
	static parseHeadings(
		content: string,
		parseHtml: boolean = false
	): HeadingInfo[] {
		const lines = content.split("\n");
		const headings: HeadingInfo[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

			if (headingMatch) {
				const level = headingMatch[1].length;
				let text = headingMatch[2].trim();

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
		const tempDiv = document.createElement("div");
		tempDiv.innerHTML = text;

		return tempDiv.textContent || tempDiv.innerText || text;
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
}
