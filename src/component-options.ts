import type { TFile } from "obsidian";

export interface ComponentOptions {
	fileNameFormat: "name" | "path";
	showFileExtension: boolean;
	dateFormat: "locale" | "iso" | "day-first" | "month-first";
	timeFormat: "locale" | "12-hour" | "24-hour";
	compactCounts: boolean;
}

export const DEFAULT_COMPONENT_OPTIONS: ComponentOptions = {
	fileNameFormat: "name",
	showFileExtension: false,
	dateFormat: "locale",
	timeFormat: "locale",
	compactCounts: false,
};

export function resolveComponentOptions(value: unknown): ComponentOptions {
	const input = value && typeof value === "object" ? value as Partial<ComponentOptions> : {};
	return {
		fileNameFormat: input.fileNameFormat === "path" ? "path" : "name",
		showFileExtension: typeof input.showFileExtension === "boolean" ? input.showFileExtension : false,
		dateFormat: input.dateFormat === "iso" || input.dateFormat === "day-first" || input.dateFormat === "month-first" ? input.dateFormat : "locale",
		timeFormat: input.timeFormat === "12-hour" || input.timeFormat === "24-hour" ? input.timeFormat : "locale",
		compactCounts: typeof input.compactCounts === "boolean" ? input.compactCounts : false,
	};
}

export function formatFileName(file: TFile | null, options: ComponentOptions): string {
	if (!file) return "";
	if (options.fileNameFormat === "name") return options.showFileExtension ? file.name : file.basename;
	return !options.showFileExtension && file.extension ? file.path.slice(0, -(file.extension.length + 1)) : file.path;
}

export function formatDate(date: Date, format: ComponentOptions["dateFormat"]): string {
	if (format === "locale") return date.toLocaleDateString();
	const year = String(date.getFullYear());
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	if (format === "iso") return `${year}-${month}-${day}`;
	return format === "day-first" ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
}

export function formatTime(date: Date, format: ComponentOptions["timeFormat"]): string {
	if (format === "locale") return date.toLocaleTimeString();
	return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: format === "12-hour" });
}

export function formatCount(count: number, label: string, compact: boolean): string {
	return compact ? String(count) : `${count} ${label}`;
}
