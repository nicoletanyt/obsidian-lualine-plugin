import { LualineItem } from "./types";

export type Side = "left" | "right";
export type ComponentLayout = Record<Side, LualineItem[]>;

export const COMPONENT_NAMES: Record<LualineItem, string> = {
	[LualineItem.FileName]: "File name",
	[LualineItem.WordCount]: "Word count",
	[LualineItem.CharCount]: "Character count",
	[LualineItem.ViewMode]: "View mode",
	[LualineItem.Backlinks]: "Backlinks",
	[LualineItem.Date]: "Date",
	[LualineItem.Time]: "Time",
	[LualineItem.VimMode]: "Vim mode",
};

export const DEFAULT_LAYOUT: ComponentLayout = {
	left: [LualineItem.FileName, LualineItem.WordCount, LualineItem.CharCount],
	right: [LualineItem.ViewMode, LualineItem.Backlinks, LualineItem.Date, LualineItem.Time, LualineItem.VimMode],
};

export function resolveLayout(value: unknown): ComponentLayout {
	if (!value || typeof value !== "object" ||
		!Array.isArray((value as ComponentLayout).left) ||
		!Array.isArray((value as ComponentLayout).right)) {
		return { left: [...DEFAULT_LAYOUT.left], right: [...DEFAULT_LAYOUT.right] };
	}
	const seen = new Set<LualineItem>();
	const valid = new Set<string>(Object.values(LualineItem));
	const clean = (items: unknown[]): LualineItem[] => items.filter((item): item is LualineItem => {
		if (typeof item !== "string" || !valid.has(item) || seen.has(item as LualineItem)) return false;
		seen.add(item as LualineItem);
		return true;
	});
	const layout = value as ComponentLayout;
	return { left: clean(layout.left), right: clean(layout.right) };
}
