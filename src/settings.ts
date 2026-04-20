import { App, PluginSettingTab, Setting } from "obsidian";
import LualinePlugin from "./main";

export interface PluginSettings {
	showFileExt: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	showFileExt: true,
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

		// new Setting(containerEl)
		// 	.setName("Settings #1")
		// 	.setDesc("It's a secret")
		// 	.addText((text) =>
		// 		text
		// 			.setPlaceholder("Enter your secret")
		// 			.setValue(this.plugin.settings.mySetting)
		// 			.onChange(async (value) => {
		// 				this.plugin.settings.mySetting = value;
		// 				await this.plugin.saveSettings();
		// 			}),
		// 	);
	}
}
