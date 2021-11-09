import { EventRef, MarkdownRenderChild } from "obsidian";
import SkribosPlugin from "src/main";
import { SkContext, Stringdex } from "src/types/types";
import { dLog, isExtant, vLog } from "src/util/util";
import { setTimeout } from "timers";
import { scopeStyle } from "./style/style";

/* The beating heart of an individual skreeb. */

interface SkChild {
	scriptsUpdated: (id?: string) => void
	sources: skChildSources
}

type skChildState = "pre" | "post" | "error"
type skChildSources = {
	templates: string[],
	styles: string[],
	integrations: string[],
	scripts: string[]
}

export class SkribiChild extends MarkdownRenderChild implements SkChild {
	private plugin: SkribosPlugin

	packet: Stringdex
	private _entryPacket: SkContext['entryPacket'] = null;
	private intervals: number[] = [];
	private cbOnUnload: [Function, any][] = []
	private cbOnPost: [Function, any][] = []

	isPost: boolean = false // True when container has attached to document 
	state: skChildState = "pre"

	templateKey?: string // The source template
	source: string // The uncompiled source string of the skribi invocation
	hash: number // Assigned when needed
	sources: skChildSources = {
		templates: [],
		styles: [],
		integrations: [],
		scripts: []
	}

	constructor(plugin: SkribosPlugin, el: HTMLElement) {
		super(el)
		this.plugin = plugin
	}

	/* Provides the 'sk.child' object. */
  public provideContext() {
    return {
      el: this.containerEl,
      registerInterval: this.skRegisterInterval.bind(this),
      registerUnload: this.skRegisterUnload.bind(this),
      registerEvent: this.skRegisterEvent.bind(this),
			registerPost: this.skRegisterPost.bind(this),
			addStyle: this.skAddStyle.bind(this),
      reload: this.rerender, // Bound on assignment in renderSkribi()
      _c: this
    }
  }

	/* Called when a script was updated. Reloads if 'id' is in script sources or null. */
	public scriptsUpdated(id?: string) {
		if (this.plugin.settings.autoReload) {
			if (!isExtant(id) || this.sources.scripts.contains(id)) this.rerender()
		}
	}

	/* Called when a plugin loads or unloads. Reloads if 'id' is in plugin sources. */
	public pluginUpdated(id: string, loading?: boolean) {
		if (this.plugin.settings.autoReload) {
			if (this.sources.integrations.contains(id)) {
				if (loading) {
					setTimeout(() => this.rerender(), 100)
				} else this.rerender()
			}
		}
	}

	/* Called when a template was updated. Reloads if 'id' is in template sources. */
	public templatesUpdated(id: string, newId?: string) {	
		if (this.plugin.settings.autoReload) {
			if ((this?.templateKey == id) || this.sources.templates.contains(id)) {
				dLog("Child received template update notification that matched one of its sources", id, this)
				this.rerender((id == this?.templateKey) ? id : null)
			}
		}
	}

	/* Called when a style template was updated. Reloads if 'id' is in style sources. */
	public stylesUpdated(id: string) {
		if (this.plugin.settings.autoReload) {
			if ((this.sources.styles).contains(id)) {
				dLog("Child received style update notification that matched one of its sources", id, this)
				this.rerender()
			}
		}
	}

	/* Add a style or template source to listen for modifications to. */
	listenFor(type: "style" | "template", id: string) {
		let l = (type == "style" ? this.sources.styles : type == "template" ? this.sources.templates : null)
		
		if (l) l.push(id) 
	}

	setPacket(packet: Stringdex) {
		if (this.packet == null) {
			this.packet = packet;
		}
	}

	/* Reverts to a pre-invocation state, such as when plugin is unloaded. */
	collapse() {
		let pre = createEl('code', {text: this.source})
		this.containerEl.replaceWith(pre)
		this.unload()
	}

	/* Reinvoke child from processor entry point. Distinct from rerender, which reinvokes from renderSkribi(). */
	reset() {
		let pre = createEl('code', {text: this.source})
		this.containerEl.replaceWith(pre)
		this.unload()
		console.log(this._entryPacket)
		// this._entryPacket[1] = this.containerEl.parentElement
		this.plugin.processor.processEntry(...this._entryPacket)
	}

	onload() {}

	onunload() {
		dLog("skreeb unload", this.containerEl);
		this.clear()
	}

	/* Clear responsibilities and retainers, prep for collection. */
	clear() {
		vLog("clear", this.containerEl)
		for (let i of this.intervals) window.clearInterval(i); // there might be cases where this doesn't get called properly (?)
		for (let cb of this.cbOnUnload) cb[0](cb[1]);

		// this.containerEl.parentNode.removeChild(this.containerEl)
		this.plugin.children.remove(this)
	}

	/* Called after render fulfillment */
	onPost() {
		this.isPost = true
		this.state = "post"
		for (let cb of this.cbOnPost) cb[0](cb[1]);
	}

  /*-- Provider Functions --*/

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
				this.skRegisterPost(() => {
					resolve(scopeStyle(this, this.containerEl, s))})
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