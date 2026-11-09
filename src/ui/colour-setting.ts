import { Setting } from "obsidian";
import type { ColorComponent, ExtraButtonComponent, TextComponent } from "obsidian";
import { normaliseHexColour } from "../theme-customisation";
import type { ColourField } from "../theme-customisation";

export function addColourSetting(
	containerEl: HTMLElement,
	field: ColourField,
	presetColour: string,
	override: string | undefined,
	onChange: (colour: string | undefined) => Promise<void>,
): void {
	const setting = new Setting(containerEl)
		.setName(field.name)
		.setClass("lualine-colour-setting");
	let picker: ColorComponent;
	let text: TextComponent;
	let reset: ExtraButtonComponent;

	const update = async (value: string, fromText = false) => {
		const colour = normaliseHexColour(value);
		const valid = value.trim() === "" || colour !== undefined;
		const message = valid ? "" : "Enter a hex colour such as #aabbcc or #abc, or clear the field.";
		text.inputEl.setAttribute("aria-invalid", String(!valid));
		text.inputEl.setCustomValidity(message);
		setting.setDesc(message);
		reset.setDisabled(valid && colour === undefined);
		if (!valid) return;

		picker.setValue(colour ?? presetColour);
		if (!fromText) text.setValue(colour ?? "");
		await onChange(colour);
	};

	setting.addColorPicker((component) => {
		picker = component;
		picker.setValue(override ?? presetColour).onChange((value) => update(value));
	});
	setting.addText((component) => {
		text = component;
		text.setPlaceholder(presetColour).setValue(override ?? "")
			.onChange((value) => update(value, true));
		text.inputEl.setAttribute("aria-label", `${field.name} hex colour`);
		text.inputEl.spellcheck = false;
		text.inputEl.maxLength = 7;
	});
	setting.addExtraButton((component) => {
		reset = component;
		reset.setIcon("reset").setTooltip("Reset to preset")
			.setDisabled(override === undefined).onClick(() => update(""));
	});
	setting.controlEl.querySelector('input[type="color"]')
		?.setAttribute("aria-label", `${field.name} colour picker`);
}
