import { SkribiError, SkribiEvalError, SkribiSyntaxError } from "src/eta/error"
import { makeErrorModalLink } from "src/modal/errorModal"
import {  REGENT_CLS } from "src/types/const"

export interface RegentData {
	[index: string]: any,
	class?: string,
	label?: string,
	clear?: boolean,
	hover?: string,
	// icon?: string
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
		var hover = "";

		if (e instanceof SkribiError) {
			hover = `${e.name}: ${e.message}`
			if (e instanceof SkribiEvalError) {
				hover += `\n${e.evalError?.name}: ${e.evalError?.message}`
			} else if (e instanceof SkribiSyntaxError) {
				hover += `\n${e.parseError.name}: ${e.parseError.message}`
			}
		} else {
			hover = (e?.name ?? "Error") + ": " + (e?.msg ?? e?.message ?? "Unknown Error");
		}

		let r = renderRegent(el, {
			class: e?.class ?? REGENT_CLS.error, 
			label: 'sk', 
			hover: hover,
			clear: true
		})

		makeErrorModalLink(r, e)
		return r
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

	el.className = `${data.noRegent ? "" : REGENT_CLS.regent} ${data.class}`
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
	// regentIcon(pre, data?.icon ?? data.class)

	return [pre, data]
}

/** Replaces 'el'.*/
export function renderRegent(el: HTMLElement, dataIn?: RegentData) {
	let [pre, data] = createRegent(dataIn)
	if (data.clear) el.className = "";
	el.replaceWith(pre)

	return pre
}