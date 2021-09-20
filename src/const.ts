import { ArgSet } from "./types/types";

export const DELIMITERS: ArgSet = {
	"PASS_VALUE": [":"]
}

export const SK_DEPTH_LIMIT = 5;

export const enum Modes {
	general = "GENERAL",
	block = "BLOCK",
}

export const enum Flags {
	none = 0,
	template = 1,
	interp = 2,
	raw = 3,
	literal = 4,
	eval = 5
}