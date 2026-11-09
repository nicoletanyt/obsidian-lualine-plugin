import { Setting } from "obsidian";
import type LualinePlugin from "../main";
import { SECTIONS, resolveSeparator } from "../section-styling";
import { normaliseHexColour } from "../theme-customisation";

export function renderSectionStyling(container: HTMLElement, plugin: LualinePlugin): void {
	new Setting(container).setName("Section separators")
		.setDesc("Choose how section edges are drawn. Original keeps the existing component styling.")
		.addDropdown((dropdown) => dropdown.addOptions({ original: "Original", angled: "Angled", rounded: "Rounded", none: "None" })
			.setValue(plugin.settings.separatorStyle).onChange(async (value) => {
				plugin.settings.separatorStyle = resolveSeparator(value);
				plugin.refreshBars();
				await plugin.saveSettings();
			}));
	new Setting(container).setName("Section colours").setDesc("Optional hex colours override the theme. Leave a field empty to use the theme.").setHeading();
	for (const section of SECTIONS) {
		const setting = new Setting(container).setName(`Section ${section.toUpperCase()}`).setClass("lualine-colour-setting");
		for (const key of ["background", "text"] as const) {
			setting.addText((text) => {
				text.setPlaceholder(key === "background" ? "Background" : "Text")
					.setValue(plugin.settings.sectionColours[section]?.[key] ?? "")
					.onChange(async (value) => {
						const colour = normaliseHexColour(value);
						const valid = !value.trim() || colour !== undefined;
						text.inputEl.setAttribute("aria-invalid", String(!valid));
						text.inputEl.setCustomValidity(valid ? "" : "Enter a hex colour such as #aabbcc or #abc.");
						if (!valid) return;
						const colours = { ...plugin.settings.sectionColours[section] };
						if (colour) colours[key] = colour;
						else delete colours[key];
						if (colours.background || colours.text) plugin.settings.sectionColours[section] = colours;
						else delete plugin.settings.sectionColours[section];
						plugin.refreshBars();
						await plugin.saveSettings();
					});
				text.inputEl.setAttribute("aria-label", `Section ${section.toUpperCase()} ${key} hex colour`);
				text.inputEl.spellcheck = false;
				text.inputEl.maxLength = 7;
			});
		}
	}
}
