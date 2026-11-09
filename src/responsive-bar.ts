import { LualineItem } from "./types";

// Hide supplemental information first, keeping the file and mode longest.
const HIDE_ORDER: LualineItem[] = [
	LualineItem.CharCount,
	LualineItem.Backlinks,
	LualineItem.Date,
	LualineItem.ViewMode,
	LualineItem.Time,
	LualineItem.WordCount,
	LualineItem.VimMode,
	LualineItem.FileName,
];

export class ResponsiveBars {
	private observer: ResizeObserver | null;
	private frames = new Map<HTMLElement, number>();
	private bars = new Set<HTMLElement>();

	constructor() {
		this.observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver((entries) => {
			for (const entry of entries) this.schedule(entry.target as HTMLElement);
		});
	}

	add(bar: HTMLElement): void {
		this.bars.add(bar);
		this.observer?.observe(bar);
		this.schedule(bar);
	}

	remove(bar: HTMLElement): void {
		this.observer?.unobserve(bar);
		this.bars.delete(bar);
		const frame = this.frames.get(bar);
		if (frame !== undefined) bar.ownerDocument.defaultView?.cancelAnimationFrame(frame);
		this.frames.delete(bar);
	}

	schedule(bar: HTMLElement): void {
		if (!this.bars.has(bar) || this.frames.has(bar)) return;
		const win = bar.ownerDocument.defaultView;
		if (!win) return;
		this.frames.set(bar, win.requestAnimationFrame(() => {
			this.frames.delete(bar);
			if (bar.isConnected) this.fit(bar);
		}));
	}

	destroy(): void {
		for (const bar of this.bars) this.remove(bar);
		this.observer?.disconnect();
	}

	prune(): void {
		for (const bar of this.bars) if (!bar.isConnected) this.remove(bar);
	}

	private fit(bar: HTMLElement): void {
		const left = bar.querySelector<HTMLElement>(".lualine-left");
		const right = bar.querySelector<HTMLElement>(".lualine-right");
		if (!left || !right || bar.clientWidth === 0) return;
		const items = Array.from(bar.querySelectorAll<HTMLElement>(".lualine-left > p, .lualine-right > p"));
		bar.classList.remove("lualine-responsive-single");
		for (const item of items) item.classList.remove("lualine-responsive-hidden");
		let visible = items.length;
		for (const component of HIDE_ORDER) {
			if (left.scrollWidth + right.scrollWidth <= bar.clientWidth || visible <= 1) break;
			const item = items.find((candidate) => candidate.classList.contains(`lualine-${component}`));
			if (item) {
				item.classList.add("lualine-responsive-hidden");
				visible--;
			}
		}
		bar.classList.toggle("lualine-responsive-single", visible === 1);
		for (const side of [left, right]) {
			const visibleItems = Array.from(side.querySelectorAll<HTMLElement>("p:not(.lualine-responsive-hidden)"));
			side.querySelectorAll<HTMLElement>("p").forEach((item) => item.classList.remove("lualine-section-start", "lualine-section-end"));
			visibleItems.forEach((item, index) => {
				if (visibleItems[index - 1]?.dataset.section !== item.dataset.section) item.classList.add("lualine-section-start");
				if (visibleItems[index + 1]?.dataset.section !== item.dataset.section) item.classList.add("lualine-section-end");
			});
		}
	}
}
