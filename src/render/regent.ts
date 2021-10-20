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
}

export interface RegentData {
	[index: string]: any,
	class?: string,
	label?: string,
	clear?: boolean,
	hover?: string,
}

/** Replaces 'el'. */
export async function renderError(el: HTMLElement, e: RegentData) {
	if (e?.flag && e.flag == "abort") {
		return renderRegent(el, Object.assign({}, {
			class: REGENT_CLS.abort,
			label: 'sk',
			hover: 'Render Aborted'
		}, e))
	} else {
		return renderRegent(el, {class: REGENT_CLS.error, label: 'sk', hover: e?.msg || "Unknown Error", clear: true})
	}
}

export function renderWait(el: HTMLElement) {
	const pre = createEl("code", {cls: `${REGENT_CLS.regent} ${REGENT_CLS.wait}`, text: "sk"})
	el.replaceWith(pre)
	return pre
}

/** Mutates 'el'. */
export async function renderState(el: HTMLElement, dataIn: RegentData) {
	let data = Object.assign({
		class: "state",
		label: "sk",
		clear: false,
		hover: ""
	}, dataIn || {})

	el.className = `skribi-regent ${data.class}`
	el.setAttribute("title", data.hover)
}

/** Creates an element. */
export function createRegent(dataIn?: RegentData): [HTMLElement, RegentData] {
	let data = Object.assign({
		class: REGENT_CLS.generic,
		label: "sk",
		clear: false,
		hover: ""
	}, dataIn || {})

	const pre = createEl("code", {cls: `${REGENT_CLS.regent} ${data.class}`, text: data.label})
	pre.setAttribute("title", data.hover)

	return [pre, data]
}

/** Replaces 'el'.*/
export function renderRegent(el: HTMLElement, dataIn?: RegentData) {
	let [pre, data] = createRegent(dataIn)
	if (data.clear) el.className = "";
	el.replaceWith(pre)

	return pre
}