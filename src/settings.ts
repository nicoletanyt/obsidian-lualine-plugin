import { App, PluginSettingTab, Setting } from "obsidian";
import type LualinePlugin from "./main";
import {
	COLOUR_SCHEMES,
	DEFAULT_COLOUR_SCHEME,
	resolveColourScheme,
} from "./themes";
import type { ColourScheme } from "./themes";
import { DEFAULT_LAYOUT } from "./components";
import type { ComponentLayout } from "./components";
import { renderComponentSettings } from "./component-settings";
import type { CustomColours } from "./theme-customisation";
import { COLOUR_FIELDS } from "./theme-customisation";
import { addColourSetting } from "./ui/colour-setting";
import { readPresetColours } from "./ui/preset-colours";
import { DEFAULT_COMPONENT_OPTIONS } from "./component-options";
import type { ComponentOptions } from "./component-options";
import { renderComponentOptions } from "./ui/component-options";
import type { SectionAssignments, SectionColours, SeparatorStyle } from "./section-styling";
import { renderSectionStyling } from "./ui/section-styling";

export interface PluginSettings {
	showFileExt: boolean;
	colourScheme: ColourScheme;
	components: ComponentLayout;
	customColours: CustomColours;
	componentOptions: ComponentOptions;
	sectionAssignments: SectionAssignments;
	sectionColours: SectionColours;
	separatorStyle: SeparatorStyle;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	showFileExt: true,
	colourScheme: DEFAULT_COLOUR_SCHEME,
	components: DEFAULT_LAYOUT,
	customColours: {},
	componentOptions: DEFAULT_COMPONENT_OPTIONS,
	sectionAssignments: {},
	sectionColours: {},
	separatorStyle: "original",
};

export class LualineSettingsTab extends PluginSettingTab {
	plugin: LualinePlugin;
	private sectionOpen: Record<string, boolean> = {
		theme: true,
		colours: false,
		layout: false,
		options: false,
		sections: false,
	};

	constructor(app: App, plugin: LualinePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.querySelectorAll<HTMLDetailsElement>(".lualine-settings-section").forEach((section) => {
			const key = section.dataset.section;
			if (key) this.sectionOpen[key] = section.open;
		});
		containerEl.empty();

		const createSection = (key: string, title: string): HTMLElement => {
			const section = containerEl.createEl("details", {
				cls: "lualine-settings-section",
				attr: { "data-section": key },
			});
			section.open = this.sectionOpen[key] ?? false;
			section.createEl("summary", { text: title });
			return section.createDiv({ cls: "lualine-settings-section-content" });
		};
		const themeSection = createSection("theme", "Theme");

		new Setting(themeSection)
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

		const colourSection = createSection("colours", "Custom colour");
		const scheme = this.plugin.settings.colourScheme;
		new Setting(colourSection)
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
				colourSection,
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

		const layoutSection = createSection("layout", "Custom layout");
		renderComponentSettings(layoutSection, this.plugin);

		const optionsSection = createSection("options", "Component options");
		renderComponentOptions(optionsSection, this.plugin);

		const stylingSection = createSection("sections", "Section styling");
		renderSectionStyling(stylingSection, this.plugin);
	}
}
