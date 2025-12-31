import { MarkdownView } from "obsidian";
import { HeadingInfo } from "./types";

export class HeadingFinder {
	static findClosestHeadingInEditMode(
		markdownView: MarkdownView,
		headings: HeadingInfo[]
	): number | null {
		const editor = markdownView.editor;
		if (!editor || headings.length === 0) return null;

		const cursor = editor.getCursor();
		const currentLine = cursor.line;

		let closestIndex = 0;
		let closestDistance = Math.abs(headings[0].line - currentLine);

		for (let i = 1; i < headings.length; i++) {
			const distance = Math.abs(headings[i].line - currentLine);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestIndex = i;
			}
		}

		return closestIndex;
	}

	static findClosestHeadingInReadingMode(
		markdownView: MarkdownView,
		headings: HeadingInfo[]
	): number | null {
		const readingView = markdownView.containerEl.querySelector(
			".markdown-reading-view"
		);
		if (!readingView || headings.length === 0) return null;

		const currentScrollPosition =
			markdownView.currentMode?.getScroll?.() ?? readingView.scrollTop;

		const binarySearchClosestHeading = (
			headings: HeadingInfo[],
			targetScrollPosition: number
		): number => {
			let closestIndex = 0;
			let low = 0;
			let high = headings.length - 1;

			while (low <= high) {
				const mid = Math.floor((low + high) / 2);
				const midLine = headings[mid].line;

				if (midLine <= targetScrollPosition) {
					closestIndex = mid;
					low = mid + 1;
				} else {
					high = mid - 1;
				}
			}
			return closestIndex;
		};

		const closestIndex = binarySearchClosestHeading(
			headings,
			currentScrollPosition + 1
		);

		return closestIndex;
	}
}

export class NavigationHelper {
	static scrollToHeading(
		markdownView: MarkdownView,
		heading: HeadingInfo
	): void {
		const file = markdownView.file;
		if (!file) return;

		const currentMode = markdownView.currentMode;

		if (currentMode && typeof currentMode.applyScroll === "function") {
			currentMode.applyScroll(heading.line);
		}
	}
}

export class DOMHelper {
	static createDiv(className: string): HTMLElement {
		return createDiv(className);
	}

	static setElementAttributes(
		element: HTMLElement,
		attributes: Record<string, string>
	): void {
		Object.entries(attributes).forEach(([key, value]) => {
			element.setAttribute(key, value);
		});
	}

	static addEventListeners(
		element: HTMLElement,
		events: Record<string, EventListener>
	): void {
		Object.entries(events).forEach(([event, listener]) => {
			element.addEventListener(event, listener);
		});
	}
}
