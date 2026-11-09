import { COLOUR_FIELDS, normaliseHexColour } from "../theme-customisation";
import type { ColourOverrides } from "../theme-customisation";
import type { ColourScheme } from "../themes";

function computedColourToHex(value: string): string | undefined {
	const hex = normaliseHexColour(value);
	if (hex) return hex;
	// Computed legacy sRGB colours use rgb() or rgba(), even if declared as hsl().
	const match = value.match(/^rgba?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/);
	if (!match) return undefined;
	return "#" + match.slice(1, 4).map((channel) =>
		Math.min(255, Math.round(Number(channel))).toString(16).padStart(2, "0"),
	).join("");
}

export function readPresetColours(containerEl: HTMLElement, scheme: ColourScheme): ColourOverrides {
	const colours: ColourOverrides = {};
	const win = containerEl.ownerDocument.defaultView;
	if (!win) return colours;
	// Read the stylesheet rather than duplicating its palettes in TypeScript.
	// This also resolves the default scheme's inherited Obsidian theme colours.
	const probe = containerEl.createDiv({
		cls: "lualine-bar lualine-colour-probe",
		attr: { "data-colour-scheme": scheme, "aria-hidden": "true" },
	});
	try {
		for (const field of COLOUR_FIELDS) {
			probe.style.setProperty("color", `var(${field.variable})`);
			const colour = computedColourToHex(win.getComputedStyle(probe).color);
			if (colour) colours[field.key] = colour;
		}
	} finally {
		probe.remove();
	}
	return colours;
}
