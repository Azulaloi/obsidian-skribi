import { EventRef, MarkdownRenderChild } from "obsidian";
import SkribosPlugin from "src/main";
import { Stringdex } from "src/types/types";
import { dLog, hash, isExtant, promiseImpl, roundTo } from "src/util";
import { promisify } from "util";
import { scopeStyle, stripStyleFromString } from "./processor";

interface SkChild {
	scriptsUpdated: () => any
}

export class SkribiChild extends MarkdownRenderChild implements SkChild {
	private plugin: SkribosPlugin

	packet: Stringdex
	private intervals: number[] = [];
	private cbOnUnload: [Function, any][] = []
	private cbOnPost: [Function, any][] = []

	isPost: boolean = false;

	templateKey?: string
	source: string

	styleTime: number

	// get hash(): number {
	// 	Object.defineProperty(this, "hash", {value: hashCode(this.source), writable: false, configurable: true})
	// 	return this.hash
	// }
	hash: number

	constructor(plugin: SkribosPlugin, el: HTMLElement) {
		super(el)
		this.plugin = plugin
	}

  public provideContext() {
    return {
      el: this.containerEl,
      registerInterval: this.skRegisterInterval.bind(this),
      registerUnload: this.skRegisterUnload.bind(this),
      registerEvent: this.skRegisterEvent.bind(this),
			registerPost: this.skRegisterPost.bind(this),
			style: this.skStyle.bind(this),
			addStyle: this.skAddStyle.bind(this),
      reload: this.rerender, // Bound on assignment
      c: this
    }
  }

	public scriptsUpdated() {
		this.rerender()
	}

	public templatesUpdated(id: string, newId?: string) {
		if (this?.templateKey == id) {
			console.log("Child received matching template update signal", id, this)
			this.rerender(id)
		}
	}

	setPacket(packet: Stringdex) {
		if (this.packet == null) {
			this.packet = packet;
		}
	}

	onload() {}

	/* NOT called by child.unload() (except sometimes it is) */
	onunload() {
		dLog("skreeb unload"); console.log("skreeb unload", this.containerEl);
		this.clear()
	}

	/* Called by rerender. */
	clear() {
		dLog("skreeb clear")
		for (let i of this.intervals) window.clearInterval(i); // there might be cases where this doesn't get called properly (?)
		for (let cb of this.cbOnUnload) cb[0](cb[1]);

		console.log("dying")
		// this.containerEl.parentNode.removeChild(this.containerEl)
		this.plugin.children.remove(this)
		
		/* When being replaced by a new skribi, unload is called after the new skribi is invoked, so we must check if we've been */
		if ((isExtant(this.styleTime)) && !(this.plugin.styler.ruleVars[this.hash]?.time ?? 0 > this.styleTime)) {
			this.plugin.styler.deleteRule(this.hash)
		}
	}

	/* Called after render fulfillment */
	onPost() {
		this.isPost = true
		for (let cb of this.cbOnPost) cb[0](cb[1]);
	}

  /*-- Provider Functions --*/

	skStyle(str: string) {
		this.hash = hash(this.source)
		this.containerEl.setAttr('sk-hash', this.hash)
		this.styleTime = roundTo(window.performance.now(), 2)

		this.plugin.styler.setRule(this.hash, {style: str, time: this.styleTime})


		// let sheet = new CSSStyleSheet()

		/*
		let x = createEl('style')
		x.innerText = str
		document.getElementsByTagName("head")[0].appendChild(x) // the sheet doesn't exist until it's connected to the doc, and we are not
		
		const l = x.sheet.cssRules.length
		for (let i = 0; i < l; ++i) {
			const rule = x.sheet.cssRules[i]

			if (!(rule instanceof CSSImportRule)) {
				scopeRule(rule, this.hash)
			}
		}

		console.log(x)

		

    document.getElementsByTagName("head")[0].removeChild(x) */


		// let x = createEl('style'/*, {type: "text/css"}*/)
		// x.innerHTML = `div[sk-hash="${hash}"] { ${str} }`

		// this.containerEl.prepend(x)
		// this.plugin.styler.setRule(this.hash, str)
	}

	// Asynchronously adds a scoped style element to the container, from string str
	// Will not resolve until post (when element is attached to document, which is required for scopeStyle())
	// Returns reference to the created element
	// TODO: if aborted before post, will promise persist in memory?
	skAddStyle(str: string): Promise<HTMLStyleElement> {
		let s = createEl('style')
		s.innerHTML = str
		this.containerEl.prepend(s)

		let p = () => {
			return new Promise((resolve, reject) => {
				this.skRegisterPost(() => {resolve(scopeStyle(this, this.containerEl, s))})
			})
		}

		return p() as Promise<HTMLStyleElement>
	}

	skRegisterInterval(cb: Function, time: number, ...args: any[]) {
		//@ts-ignore
		let x = window.setInterval((...a: any) => { if (this._loaded == false) {window.clearInterval(x)}
			cb(...a)}, time * 1000, ...args)
		this.intervals.push(x)
		return x;
	}

  skRegisterEvent(event: EventRef) {
    dLog('SkChild registered event:', event)
    this.registerEvent(event)
  }

	skRegisterUnload(cb: Function, ...args: any[]) {
		this.cbOnUnload.push([(...x: any) => cb(...x), args])
	}

	skRegisterPost(cb: Function, ...args: any[]) {
		if (!this.isPost) {
			this.cbOnPost.push([(...x: any) => cb(...x), args])
		} else {
			((...x: any) => cb(...x))(args)
		}
	}

  // Assigned in renderSkribi()
  rerender(...args: any[]) {}
}


function scopeRule(rule: CSSRule, hash: number) {
	if (!(rule instanceof CSSStyleRule)) return

	rule.selectorText = `[sk-hash=${hash}]:and(${rule.selectorText})`
}