export interface RegentData {
	[index: string]: any,
	class?: string,
	label?: string,
	clear?: boolean,
	hover?: string,
}

export async function renderError(el: HTMLElement, e: RegentData) {
	if (e?.flag && e.flag == "abort") {
		return renderRegent(el, Object.assign({}, {
			class: 'abort',
			label: 'sk',
			hover: 'Render Aborted'
		}, e))
	} else {
		return renderRegent(el, {class: 'error', label: 'sk', hover: e?.msg || "Unknown Error", clear: true})
	}
}

export function renderWait(el: HTMLElement) {
	const pre = createEl("code", {cls: "skribi-regent wait", text: "sk"})
	el.replaceWith(pre)
	return pre
}

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

export function createRegent(dataIn?: RegentData): [HTMLElement, RegentData] {
	let data = Object.assign({
		class: "generic",
		label: "sk",
		clear: false,
		hover: ""
	}, dataIn || {})

	const pre = createEl("code", {cls: `skribi-regent ${data.class}`, text: data.label})
	pre.setAttribute("title", data.hover)

	return [pre, data]
}

export function renderRegent(el: HTMLElement, dataIn?: RegentData) {
	let [pre, data] = createRegent(dataIn)
	if (data.clear) el.className = "";
	el.replaceWith(pre)

	return pre
}