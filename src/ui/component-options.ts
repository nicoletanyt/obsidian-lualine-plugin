import { Setting } from "obsidian";
import type LualinePlugin from "../main";
import type { ComponentOptions } from "../component-options";

export function renderComponentOptions(container: HTMLElement, plugin: LualinePlugin): void {
	const update = async () => {
		plugin.refreshBars();
		await plugin.saveSettings();
	};
	new Setting(container).setName("File name display")
		.setDesc("Show only the file name or its path relative to the vault.")
		.addDropdown((dropdown) => dropdown.addOptions({ name: "File name", path: "Vault-relative path" })
			.setValue(plugin.settings.componentOptions.fileNameFormat)
			.onChange(async (value) => {
				plugin.settings.componentOptions.fileNameFormat = value === "path" ? "path" : "name";
				await update();
			}));
	new Setting(container).setName("Show file extension")
		.setDesc("Include the extension in the file name or path.")
		.addToggle((toggle) => toggle.setValue(plugin.settings.componentOptions.showFileExtension)
			.onChange(async (value) => { plugin.settings.componentOptions.showFileExtension = value; await update(); }));
	new Setting(container).setName("Date format")
		.addDropdown((dropdown) => dropdown.addOptions({ locale: "System default", iso: "YYYY-MM-DD", "day-first": "DD/MM/YYYY", "month-first": "MM/DD/YYYY" })
			.setValue(plugin.settings.componentOptions.dateFormat)
			.onChange(async (value) => {
				const valid: ComponentOptions["dateFormat"][] = ["locale", "iso", "day-first", "month-first"];
				plugin.settings.componentOptions.dateFormat = valid.find((format) => format === value) ?? "locale";
				await update();
			}));
	new Setting(container).setName("Time format")
		.addDropdown((dropdown) => dropdown.addOptions({ locale: "System default", "12-hour": "12-hour", "24-hour": "24-hour" })
			.setValue(plugin.settings.componentOptions.timeFormat)
			.onChange(async (value) => {
				plugin.settings.componentOptions.timeFormat = value === "12-hour" || value === "24-hour" ? value : "locale";
				await update();
			}));
	new Setting(container).setName("Compact counts")
		.setDesc("Show numbers without labels for word count, character count, and backlinks.")
		.addToggle((toggle) => toggle.setValue(plugin.settings.componentOptions.compactCounts)
			.onChange(async (value) => { plugin.settings.componentOptions.compactCounts = value; await update(); }));
}
