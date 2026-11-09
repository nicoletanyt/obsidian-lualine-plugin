import { App, MarkdownView, Modal, Plugin, WorkspaceLeaf } from "obsidian";
import {
	DEFAULT_SETTINGS,
	LualineSettingsTab,
	PluginSettings,
} from "./settings";
import { LualineItem } from "types";
import { resolveColourScheme } from "./themes";
import { resolveLayout } from "./components";
import { applyBarTheme, normaliseCustomColours } from "./theme-customisation";
import { formatCount, formatDate, formatFileName, formatTime, resolveComponentOptions } from "./component-options";
import { ResponsiveBars } from "./responsive-bar";
import { resolveAssignments, resolveSectionColours, resolveSeparator, SIDE_SECTIONS } from "./section-styling";

// Remember to rename these classes and interfaces!

export default class LualinePlugin extends Plugin {
	settings: PluginSettings;
	private saveQueue: Promise<void> = Promise.resolve();
	private responsiveBars = new ResponsiveBars();

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

				this.updateComponent(LualineItem.ViewMode);
				this.updateComponent(LualineItem.Backlinks);
			}),
		);

		this.registerDomEvent(document, "keyup", (_) => {
			this.updateComponent(LualineItem.VimMode);
			this.updateComponent(LualineItem.WordCount);
			this.updateComponent(LualineItem.CharCount);
		});
		this.registerInterval(window.setInterval(() => {
			this.updateComponent(LualineItem.Time);
			this.updateComponent(LualineItem.Date);
		}, 1000));

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
				this.responsiveBars.prune();
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

	getFileName(leaf?: WorkspaceLeaf): string {
		const file = leaf?.view instanceof MarkdownView ? leaf.view.file : this.app.workspace.getActiveFile();
		return formatFileName(file, this.settings.componentOptions);
	}

	getDate(): string {
		const date = new Date();
		return formatDate(date, this.settings.componentOptions.dateFormat);
	}

	getTime(): string {
		const date = new Date();
		return formatTime(date, this.settings.componentOptions.timeFormat);
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
		if (!this.settings.components.left.includes(component) && !this.settings.components.right.includes(component)) return;
		this.app.workspace.iterateAllLeaves((leaf) => {
			leaf.view.containerEl.querySelectorAll<HTMLElement>(`.lualine-bar .lualine-${component}`).forEach((el) => {
				const label = this.getComponentLabel(component, leaf);
				const target = component === LualineItem.FileName ? el.querySelector<HTMLElement>(".lualine-filename-text") : el;
				target?.setText(label);
				if (component === LualineItem.FileName) el.setAttribute("title", label);
				if (component === LualineItem.VimMode) el.setAttr("data-mode", label);
				const bar = el.closest<HTMLElement>(".lualine-bar");
				if (bar) this.responsiveBars.schedule(bar);
			});
		});
	}

	injectBar(leaf: WorkspaceLeaf | null) {
		if (!leaf) return;
		if (!(leaf.view instanceof MarkdownView)) return;

		const previous = leaf.view.containerEl.querySelector<HTMLElement>(".lualine-bar");
		if (previous) {
			this.responsiveBars.remove(previous);
			previous.remove();
		}
		const bar = leaf.view.containerEl.createEl("div", {
			cls: "lualine-bar",
			attr: { "data-separator-style": this.settings.separatorStyle },
		});
		applyBarTheme(bar, this.settings.colourScheme, this.settings.customColours[this.settings.colourScheme]);
		const leftSide = bar.createEl("div", {
			cls: "lualine-left",
		});
		const rightSide = bar.createEl("div", {
			cls: "lualine-right",
		});

		const leftComponents = this.settings.components.left;
		const rightComponents = this.settings.components.right;
		const styleComponent = (el: HTMLElement, component: LualineItem, side: "left" | "right") => {
			const section = this.settings.sectionAssignments[component] ?? SIDE_SECTIONS[side][0]!;
			el.dataset.section = section;
			const colours = this.settings.sectionColours[section];
			if (colours?.background) el.style.backgroundColor = colours.background;
			if (colours?.text) el.style.color = colours.text;
		};

		leftComponents.forEach((component, index) => {
			const el = leftSide.createEl("p", {
				cls: `lualine-${component} ${index == 0 && "first-item"}`,
				text: component === LualineItem.FileName ? "" : this.getComponentLabel(component, leaf),
			});
			styleComponent(el, component, "left");
			if (component === LualineItem.VimMode) el.setAttr("data-mode", el.textContent ?? "");
			if (component === LualineItem.FileName) {
				const label = this.getComponentLabel(component, leaf);
				el.createSpan({ cls: "lualine-filename-text", text: label });
				el.setAttribute("title", label);
			}
		});
		rightComponents.forEach((component, index) => {
			const el = rightSide.createEl("p", {
				cls: `lualine-${component} ${index == rightComponents.length - 1 && "last-item"}`,
				text: component === LualineItem.FileName ? "" : this.getComponentLabel(component, leaf),
			});
			styleComponent(el, component, "right");
			if (component === LualineItem.VimMode) el.setAttr("data-mode", el.textContent ?? "");
			if (component === LualineItem.FileName) {
				const label = this.getComponentLabel(component, leaf);
				el.createSpan({ cls: "lualine-filename-text", text: label });
				el.setAttribute("title", label);
			}
		});
		this.responsiveBars.add(bar);
	}

	refreshBars() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView && leaf.view.containerEl.querySelector(".lualine-bar")) {
				this.injectBar(leaf);
			}
		});
	}

	applyColourScheme() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			leaf.view.containerEl.querySelectorAll<HTMLElement>(".lualine-bar").forEach((bar) => {
				applyBarTheme(bar, this.settings.colourScheme, this.settings.customColours[this.settings.colourScheme]);
			});
		});
	}

	getComponentLabel(component: LualineItem, leaf?: WorkspaceLeaf): string {
		switch (component) {
			case LualineItem.VimMode:
				return this.getVimMode();
			case LualineItem.FileName:
				return this.getFileName(leaf);
			case LualineItem.WordCount:
				return formatCount(this.getWordCount(), "words", this.settings.componentOptions.compactCounts);
			case LualineItem.Date:
				return this.getDate();
			case LualineItem.Time:
				return this.getTime();
			case LualineItem.CharCount:
				return formatCount(this.getCharCount(), "chars", this.settings.componentOptions.compactCounts);
			case LualineItem.ViewMode:
				return this.getViewMode();
			case LualineItem.Backlinks:
				return formatCount(this.getBacklinks(), "backlinks", this.settings.componentOptions.compactCounts);
		}
	}

	onunload() {
		this.responsiveBars.destroy();
		this.app.workspace.iterateAllLeaves((leaf) => {
			leaf.view.containerEl.querySelectorAll(".lualine-bar").forEach((bar) => bar.remove());
		});
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<PluginSettings>,
		);
		this.settings.colourScheme = resolveColourScheme(this.settings.colourScheme);
		this.settings.components = resolveLayout(this.settings.components);
		this.settings.customColours = normaliseCustomColours(this.settings.customColours);
		this.settings.componentOptions = resolveComponentOptions(this.settings.componentOptions);
		this.settings.sectionAssignments = resolveAssignments(this.settings.sectionAssignments, this.settings.components);
		this.settings.sectionColours = resolveSectionColours(this.settings.sectionColours);
		this.settings.separatorStyle = resolveSeparator(this.settings.separatorStyle);
	}

	async saveSettings() {
		const snapshot: PluginSettings = {
			...this.settings,
			components: {
				left: [...this.settings.components.left],
				right: [...this.settings.components.right],
			},
			componentOptions: { ...this.settings.componentOptions },
			sectionAssignments: { ...this.settings.sectionAssignments },
			sectionColours: resolveSectionColours(this.settings.sectionColours),
		};
		this.saveQueue = this.saveQueue.catch(() => {}).then(() => this.saveData(snapshot));
		await this.saveQueue;
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
