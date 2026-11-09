import { App, PluginSettingTab, Setting } from "obsidian";
import type LualinePlugin from "./main";
import {
	COLOUR_SCHEMES,
	DEFAULT_COLOUR_SCHEME,
	resolveColourScheme,
} from "./themes";
import type { ColourScheme } from "./themes";
import type { CustomColours } from "./theme-customisation";
import { COLOUR_FIELDS } from "./theme-customisation";
import { addColourSetting } from "./ui/colour-setting";
import { readPresetColours } from "./ui/preset-colours";

export interface PluginSettings {
	showFileExt: boolean;
	colourScheme: ColourScheme;
	customColours: CustomColours;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	showFileExt: true,
	colourScheme: DEFAULT_COLOUR_SCHEME,
	customColours: {},
};

export class LualineSettingsTab extends PluginSettingTab {
	plugin: LualinePlugin;

	constructor(app: App, plugin: LualinePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setName("Colours").setHeading();

		new Setting(containerEl)
			.setName("Colour scheme")
			.setDesc("Choose colours for the status bar. Changes apply immediately.")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(COLOUR_SCHEMES)
					.setValue(this.plugin.settings.colourScheme)
					.onChange(async (value) => {
						this.plugin.settings.colourScheme = resolveColourScheme(value);
						this.plugin.applyColourScheme();
						this.display();
						await this.plugin.saveSettings();
					}),
			);

		const scheme = this.plugin.settings.colourScheme;
		new Setting(containerEl)
			.setName("Custom colours")
			.setDesc("Override colours for this preset. Leave a hex field blank to use the preset colour.")
			.addButton((button) => button.setButtonText("Reset to preset").onClick(async () => {
				delete this.plugin.settings.customColours[scheme];
				this.plugin.applyColourScheme();
				this.display();
				await this.plugin.saveSettings();
			}));

		const presetColours = readPresetColours(containerEl, scheme);
		for (const field of COLOUR_FIELDS) {
			addColourSetting(
				containerEl,
				field,
				presetColours[field.key] ?? "#000000",
				this.plugin.settings.customColours[scheme]?.[field.key],
				async (colour) => {
					const overrides = { ...this.plugin.settings.customColours[scheme] };
					if (colour) overrides[field.key] = colour;
					else delete overrides[field.key];
					if (Object.keys(overrides).length > 0) {
						this.plugin.settings.customColours[scheme] = overrides;
					} else {
						delete this.plugin.settings.customColours[scheme];
					}
					this.plugin.applyColourScheme();
					await this.plugin.saveSettings();
				},
			);
		}
	}
}
