import { COLOUR_SCHEMES } from "./themes";
import type { ColourScheme } from "./themes";

export const COLOUR_FIELDS = [
	{ key: "background", name: "Bar background", variable: "--lualine-background" },
	{ key: "text", name: "Bar text", variable: "--lualine-text" },
	{ key: "sectionBackground", name: "Filename background", variable: "--lualine-section-background" },
	{ key: "sectionText", name: "Filename text", variable: "--lualine-section-text" },
	{ key: "modeText", name: "Vim mode text", variable: "--lualine-mode-text" },
	{ key: "normal", name: "Normal mode background", variable: "--lualine-normal" },
	{ key: "insert", name: "Insert mode background", variable: "--lualine-insert" },
	{ key: "visual", name: "Visual mode background", variable: "--lualine-visual" },
	{ key: "visualText", name: "Visual mode text", variable: "--lualine-visual-text" },
	{ key: "visualBlock", name: "Visual block background", variable: "--lualine-visual-block" },
] as const;

export type ColourField = (typeof COLOUR_FIELDS)[number];
export type ColourOverrides = Partial<Record<ColourField["key"], string>>;
export type CustomColours = Partial<Record<ColourScheme, ColourOverrides>>;

export function normaliseHexColour(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const colour = value.trim().toLowerCase();
	if (/^#[\da-f]{6}$/.test(colour)) return colour;
	if (/^#[\da-f]{3}$/.test(colour)) {
		return "#" + colour.slice(1).split("").map((digit) => digit + digit).join("");
	}
	return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normaliseCustomColours(value: unknown): CustomColours {
	const result: CustomColours = {};
	if (!isRecord(value)) return result;
	for (const scheme of Object.keys(COLOUR_SCHEMES) as ColourScheme[]) {
		const saved = value[scheme];
		if (!isRecord(saved)) continue;
		const colours: ColourOverrides = {};
		for (const field of COLOUR_FIELDS) {
			const colour = normaliseHexColour(saved[field.key]);
			if (colour) colours[field.key] = colour;
		}
		if (Object.keys(colours).length > 0) result[scheme] = colours;
	}
	return result;
}

export function applyBarTheme(
	bar: HTMLElement,
	scheme: ColourScheme,
	overrides: ColourOverrides = {},
): void {
	bar.setAttribute("data-colour-scheme", scheme);
	for (const field of COLOUR_FIELDS) {
		const colour = normaliseHexColour(overrides[field.key]);
		if (colour) bar.style.setProperty(field.variable, colour);
		else bar.style.removeProperty(field.variable);
	}
}
