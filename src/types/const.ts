import { ArgSet } from "./types";

export const VAR_NAME: string = 'sk'

export const DELIMITERS: ArgSet = {
	"PASS_VALUE": [":"]
}

// Unused. TODO: make the depth detection use a variable limit
export const SK_DEPTH_LIMIT = 5;

/** Types of skribi processing modes. */
export const enum Modes {
	/** Invocation was a code span. */
	general = "GENERAL",
	/** Invocation was a code block. */
	block = "BLOCK",
}

/** Types of skribi processing types. */
export const enum Flags {
	none = 0,
	template = 1,
	interp = 2,
	raw = 3,
	literal = 4,
	eval = 5
}

/* Separator for console logging. */
export const EBAR = `\n---------------------------\n`

/** Miscellaneous classes. */
export const CLS = {
	virtual: "skribi-render-virtual",
	/** The anim class toggles Skribi CSS animations on when applied to the document body. */
	anim: "skribi-anims",
}

/** Classes for regent elements. */
export const REGENT_CLS = {
	regent: "skribi-regent", // Regent base
	error: "skr-error", // Something threw somewhere
	abort: "skr-abort", // Aborted by sk.abort()
	depth: "skr-depth", // Embedder depth limit
	stasis: "skr-stasis", // Processor depth limit
	wait: "skr-waiting", // Awaiting template load
	eval: "skr-evaluating", // Awaiting function evaluation
	self: "skr-self", // Within self definition
	state: "skr-state", // Fallback for renderState
	generic: "skr-generic", // Fallback for createRegent
	syntax_eta: "skr-syntax-eta", // For eta syntax errors
	syntax_js: "skr-syntax-js" // For JS syntax errors
}

/** The potential states of a template or script. */
export const enum PartialState {
	/** Partial is not present. */
	ABSENT = -1,
	/** Present, but failed to compile. */
	FAILED = 0,
	/** Present and ready. */
	LOADED = 1
}