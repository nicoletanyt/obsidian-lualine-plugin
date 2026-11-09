export const COLOUR_SCHEMES = {
	"catppuccin-mocha": "Catppuccin Mocha",
	"kanagawa-dragon": "Kanagawa Dragon",
	"gruvbox-dark": "Gruvbox Dark",
	"github-dark": "GitHub Dark",
	"tokyo-night": "Tokyo Night",
	nord: "Nord",
	dracula: "Dracula",
} as const;

export type ColourScheme = keyof typeof COLOUR_SCHEMES;

export const DEFAULT_COLOUR_SCHEME: ColourScheme = "catppuccin-mocha";

export function resolveColourScheme(value: unknown): ColourScheme {
	if (
		typeof value === "string" &&
		Object.prototype.hasOwnProperty.call(COLOUR_SCHEMES, value)
	) {
		return value as ColourScheme;
	}

	return DEFAULT_COLOUR_SCHEME;
}
