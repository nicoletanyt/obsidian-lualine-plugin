import { App, MarkdownView, Modal, Plugin, WorkspaceLeaf } from "obsidian";
import {
	DEFAULT_SETTINGS,
	LualineSettingsTab,
	PluginSettings,
} from "./settings";
import { LualineItem } from "types";
import { resolveColourScheme } from "./themes";
import { applyBarTheme, normaliseCustomColours } from "./theme-customisation";

// Remember to rename these classes and interfaces!

export default class LualinePlugin extends Plugin {
	settings: PluginSettings;

	componentEls: Map<LualineItem, HTMLElement> = new Map();

	async onload() {
		await this.loadSettings();

		// add settings tab
		this.addSettingTab(new LualineSettingsTab(this.app, this));
		this.app.workspace.onLayoutReady(() => {
			this.injectBar(this.app.workspace.getMostRecentLeaf());
		});

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, "click", (evt: MouseEvent) => {
		// 	new Notice("Click");
		// });

		// creates the leaf for statusbar
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				this.injectBar(leaf);

				if (this.componentEls.has(LualineItem.Time)) {
					this.registerInterval(
						window.setInterval(() => {
							this.updateComponent(LualineItem.Time);
						}, 1000),
					);
				}

				this.updateComponent(LualineItem.ViewMode);
				this.updateComponent(LualineItem.Backlinks);
			}),
		);

		this.registerDomEvent(document, "keyup", (_) => {
			this.updateComponent(LualineItem.VimMode);
			this.updateComponent(LualineItem.WordCount);
			this.updateComponent(LualineItem.CharCount);
		});

		this.registerEvent(
			this.app.workspace.on("file-open", (_) => {
				this.updateComponent(LualineItem.FileName);
				this.updateComponent(LualineItem.ViewMode);
				this.updateComponent(LualineItem.Backlinks);
			}),
		);

		this.registerEvent(
			this.app.metadataCache.on("resolved", () => {
				this.updateComponent(LualineItem.Backlinks);
			}),
		);

		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				this.updateComponent(LualineItem.ViewMode);
			}),
		);
	}

	getVimMode(): string {
		const mode =
			// @ts-ignore
			this.app.workspace.activeEditor?.editor?.cm.state.values[0].cm.state
				.vim.mode ?? "NORMAL";

		return mode.toUpperCase();
	}

	getWordCount(): number {
		// word count
		const content =
			this.app.workspace.activeEditor?.editor?.getValue() ?? "";
		const wordCount = content
			.split(/\s+/)
			.filter((w) => w.length > 0).length;

		return wordCount;
	}

	getCharCount(): number {
		const content =
			this.app.workspace.activeEditor?.editor?.getValue() ?? "";
		return content.length;
	}

	getFileName(): string {
		const file = this.app.workspace.getActiveFile();
		return file?.basename ?? "";
	}

	getDate(): string {
		const date = new Date();
		return date.toLocaleDateString();
	}

	getTime(): string {
		const date = new Date();
		return date.toLocaleTimeString();
	}

	getViewMode(): string {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		return view?.getMode() ?? "source";
	}

	getBacklinks(): number {
		const file = this.app.workspace.getActiveFile();
		if (!file) return 0;

		// @ts-ignore
		const backlinks = this.app.metadataCache.getBacklinksForFile(file);
		return backlinks.count();
	}

	updateComponent(component: LualineItem) {
		const el = this.componentEls.get(component);
		if (!el) return;
		const label = this.getComponentLabel(component);
		el.setText(label);
		if (component == LualineItem.VimMode) {
			el.setAttr("data-mode", label);
		}
	}

	injectBar(leaf: WorkspaceLeaf | null) {
		console.log("Injected Bar");
		if (!leaf) return;
		if (!(leaf.view instanceof MarkdownView)) return;

		leaf.view.containerEl.querySelector(".lualine-bar")?.remove();
		const bar = leaf.view.containerEl.createEl("div", {
			cls: "lualine-bar",
		});
		applyBarTheme(bar, this.settings.colourScheme, this.settings.customColours[this.settings.colourScheme]);
		const leftSide = bar.createEl("div", {
			cls: "lualine-left",
		});
		const rightSide = bar.createEl("div", {
			cls: "lualine-right",
		});

		const leftComponents: LualineItem[] = [
			LualineItem.FileName,
			LualineItem.WordCount,
			LualineItem.CharCount,
		];
		const rightComponents: LualineItem[] = [
			LualineItem.ViewMode,
			LualineItem.Backlinks,
			LualineItem.Date,
			LualineItem.Time,
			LualineItem.VimMode,
		];

		leftComponents.forEach((component, index) => {
			const el = leftSide.createEl("p", {
				cls: `lualine-${component} ${index == 0 && "first-item"}`,
				text: this.getComponentLabel(component),
			});
			this.componentEls.set(component, el);
		});
		rightComponents.forEach((component, index) => {
			const el = rightSide.createEl("p", {
				cls: `lualine-${component} ${index == rightComponents.length - 1 && "last-item"}`,
				text: this.getComponentLabel(component),
			});
			this.componentEls.set(component, el);
		});
		this.updateComponent(LualineItem.VimMode);
	}

	applyColourScheme() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			leaf.view.containerEl.querySelectorAll<HTMLElement>(".lualine-bar").forEach((bar) => {
				applyBarTheme(bar, this.settings.colourScheme, this.settings.customColours[this.settings.colourScheme]);
			});
		});
	}

	getComponentLabel(component: LualineItem): string {
		switch (component) {
			case LualineItem.VimMode:
				return this.getVimMode();
			case LualineItem.FileName:
				return this.getFileName();
			case LualineItem.WordCount:
				return this.getWordCount() + " words";
			case LualineItem.Date:
				return this.getDate();
			case LualineItem.Time:
				return this.getTime();
			case LualineItem.CharCount:
				return this.getCharCount() + " chars";
			case LualineItem.ViewMode:
				return this.getViewMode();
			case LualineItem.Backlinks:
				return this.getBacklinks() + " backlinks";
		}
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<PluginSettings>,
		);
		this.settings.colourScheme = resolveColourScheme(this.settings.colourScheme);
		this.settings.customColours = normaliseCustomColours(this.settings.customColours);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
