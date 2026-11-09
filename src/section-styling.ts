import { LualineItem } from "./types";
import type { ComponentLayout, Side } from "./components";
import { normaliseHexColour } from "./theme-customisation";

export const SECTIONS = ["a", "b", "c", "x", "y", "z"] as const;
export type Section = typeof SECTIONS[number];
export type SectionAssignments = Partial<Record<LualineItem, Section>>;
export type SectionColours = Partial<Record<Section, { background?: string; text?: string }>>;
export type SeparatorStyle = "original" | "angled" | "rounded" | "none";
export const SIDE_SECTIONS: Record<Side, readonly Section[]> = { left: ["a", "b", "c"], right: ["x", "y", "z"] };

export function resolveAssignments(value: unknown, layout: ComponentLayout): SectionAssignments {
	const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
	const result: SectionAssignments = {};
	for (const side of ["left", "right"] as const) {
		for (const item of layout[side]) {
			const section = input[item];
			result[item] = SIDE_SECTIONS[side].find((candidate) => candidate === section) ?? SIDE_SECTIONS[side][0];
		}
		layout[side].sort((a, b) => SIDE_SECTIONS[side].indexOf(result[a]!) - SIDE_SECTIONS[side].indexOf(result[b]!));
	}
	return result;
}

export function resolveSectionColours(value: unknown): SectionColours {
	const result: SectionColours = {};
	if (!value || typeof value !== "object") return result;
	const input = value as Record<string, unknown>;
	for (const section of SECTIONS) {
		const raw = input[section];
		if (!raw || typeof raw !== "object") continue;
		const values = raw as Record<string, unknown>;
		const background = normaliseHexColour(values.background);
		const text = normaliseHexColour(values.text);
		if (background || text) result[section] = { background, text };
	}
	return result;
}

export function resolveSeparator(value: unknown): SeparatorStyle {
	return value === "angled" || value === "rounded" || value === "none" ? value : "original";
}
