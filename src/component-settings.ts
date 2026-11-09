import { setIcon, Setting } from "obsidian";
import type LualinePlugin from "./main";
import { COMPONENT_NAMES, DEFAULT_LAYOUT } from "./components";
import type { Side } from "./components";
import { LualineItem } from "./types";

export function renderComponentSettings(container: HTMLElement, plugin: LualinePlugin): void {
	let dragged: { side: Side; item: LualineItem } | null = null;
	const refresh = async () => {
		plugin.refreshBars();
		draw();
		await plugin.saveSettings();
	};
	const move = (from: Side, item: LualineItem, to: Side, index: number) => {
		const layout = plugin.settings.components;
		const oldIndex = layout[from].indexOf(item);
		if (oldIndex < 0) return;
		layout[from].splice(oldIndex, 1);
		if (from === to && oldIndex < index) index--;
		layout[to].splice(index, 0, item);
		void refresh();
	};
	const draw = () => {
		container.empty();
		new Setting(container)
			.setName("Components")
			.setDesc("Choose and arrange the components on each side of the bar.")
			.addButton((button) => button
			.setButtonText("Reset layout").onClick(() => {
				plugin.settings.components = { left: [...DEFAULT_LAYOUT.left], right: [...DEFAULT_LAYOUT.right] };
				void refresh();
			}));
		const preview = container.createDiv({ cls: "lualine-settings-preview" });
		for (const side of ["left", "right"] as const) {
			const group = preview.createDiv({ cls: `lualine-settings-preview-${side}` });
			for (const item of plugin.settings.components[side]) group.createSpan({ text: COMPONENT_NAMES[item] });
		}
		const columns = container.createDiv({ cls: "lualine-settings-columns" });
		for (const side of ["left", "right"] as const) {
			const column = columns.createDiv({ cls: "lualine-settings-column" });
			column.createEl("h4", { text: side === "left" ? "Left" : "Right" });
			const list = column.createDiv({ cls: "lualine-settings-list" });
			list.addEventListener("dragover", (event) => event.preventDefault());
			list.addEventListener("drop", (event) => {
				event.preventDefault();
				if (dragged) move(dragged.side, dragged.item, side, plugin.settings.components[side].length);
				dragged = null;
			});
			plugin.settings.components[side].forEach((item, index) => {
				const row = list.createDiv({ cls: "lualine-settings-row", attr: { draggable: "true" } });
				row.addEventListener("dragstart", (event) => {
					dragged = { side, item };
					event.dataTransfer?.setData("text/plain", item);
				});
				row.addEventListener("dragend", () => { dragged = null; });
				row.addEventListener("drop", (event) => {
					event.preventDefault();
					event.stopPropagation();
					if (dragged) {
						const after = event.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2;
						move(dragged.side, dragged.item, side, index + (after ? 1 : 0));
					}
					dragged = null;
				});
				const grip = row.createSpan({ cls: "lualine-settings-grip", attr: { "aria-hidden": "true" } });
				setIcon(grip, "grip-vertical");
				row.createSpan({ text: COMPONENT_NAMES[item], cls: "lualine-settings-name" });
				const button = (icon: string, label: string, action: () => void, disabled = false) => {
					const el = row.createEl("button", { cls: "clickable-icon", attr: { "aria-label": `${label} ${COMPONENT_NAMES[item]}`, title: label, type: "button" } });
					setIcon(el, icon);
					el.disabled = disabled;
					el.addEventListener("click", action);
				};
				button("chevron-up", "Move up", () => move(side, item, side, index - 1), index === 0);
				button("chevron-down", "Move down", () => move(side, item, side, index + 2), index === plugin.settings.components[side].length - 1);
				const other = side === "left" ? "right" : "left";
				button(side === "left" ? "arrow-right" : "arrow-left", `Move to ${other}`, () => move(side, item, other, plugin.settings.components[other].length));
				button("x", "Remove", () => { plugin.settings.components[side].splice(index, 1); void refresh(); });
			});
			const used = new Set([...plugin.settings.components.left, ...plugin.settings.components.right]);
			const available = Object.values(LualineItem).filter((item) => !used.has(item));
			if (available.length) {
				const select = column.createEl("select", { cls: "dropdown", attr: { "aria-label": `Add component to ${side}` } });
				select.createEl("option", { text: "Add component", value: "" });
				for (const item of available) select.createEl("option", { text: COMPONENT_NAMES[item], value: item });
				select.addEventListener("change", () => {
					const item = available.find((candidate) => String(candidate) === select.value);
					if (item) { plugin.settings.components[side].push(item); void refresh(); }
				});
			}
		}
	};
	draw();
}
