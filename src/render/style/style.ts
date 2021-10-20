import SkribosPlugin from "src/main"
import { EBAR } from "src/types/const"
import { hash } from "src/util"
import type { SkribiChild } from "../child"
import { prefixSelectors } from "./polyfill"

/* STYLE FUNCTIONS */

export function stripStyleFromString(str: string): [string, HTMLStyleElement | null] {
	let x = createDiv()
	x.innerHTML = str
	// console.log('prestrip', x)
	let style = x.querySelector('style')
	if (style) x.removeChild(style)

	return [x.innerHTML, style ?? null]
}

/* s must be attached to document or s.sheet will be null */
export function scopeStyle(child: SkribiChild, el: HTMLElement, s: HTMLStyleElement): HTMLStyleElement {
	child.hash = child.hash ?? hash(child.source)
	child.containerEl.setAttr('sk-hash', child.hash)
	if (!s.sheet) {
		console.warn("Skribi: Could not scope style because it was not attached to the document!", EBAR, "Style: ", s, EBAR, "In element: ", el, EBAR, "Of child:", child); 
		return
	}
	const l = s.sheet.cssRules.length
	for (let i = 0; i < l; ++i) {
		const rule = s.sheet.cssRules[i]

		if (!(rule instanceof CSSImportRule)) {
			scopeRule(rule, ['sk-hash', child.hash])
		}
	}

	/* Changing the rule properties doesn't change the text of the style element, so we do it manually so make the resolved behavior visible for users in element panel */
	if ((window.app.plugins.plugins['obsidian-skribi'] as SkribosPlugin).settings.reflectStyleTagText) {
		let rules = []
		for (let i = 0; i < s.sheet.cssRules.length; i++) {
			rules.push(s.sheet.cssRules.item(i))
		}
		let str = rules.reduce<string>((a: string, b: CSSRule) => {return a + `${b.cssText}` + '\n'}, "")
		s.textContent = str
	}

	return s
}

/** Mutates a CSSRule's selectors to select elements with attribute 'sk-hash' equal to hash 
/* @param rule CSSRule to scope 
/* @param hash [attrKey, attrVal] to target */
function scopeRule(rule: CSSRule, target: [string, number]): void {
	if (!(rule instanceof CSSStyleRule)) return; // media and import rules ignored

	let b = prefixSelectors(rule.selectorText, `[${target[0]}='${target[1]}']`)
	rule.selectorText = b
}