import { EventRef, MarkdownRenderChild } from "obsidian";
import SkribosPlugin from "src/main";
import { SkContext, Stringdex } from "src/types/types";
import { dLog, hash, isExtant, vLog } from "src/util/util";
import { setTimeout } from "timers";
import { scopeStyle } from "./style/style";

/** The beating heart of an individual skreeb. */
export class SkribiChild extends MarkdownRenderChild implements SkChild {
	private plugin: SkribosPlugin

	packet: Stringdex
	private _entryPacket: SkContext['entryPacket'] = null;
	private intervals: number[] = [];
	private cbOnUnload: [Function, any][] = []
	private cbOnPost: [Function, any][] = []

	/** True when the container has attached to the document. */
	isPost: boolean = false
	state: skChildState = "pre"

	/** The key of the template from which this skribi was invoked. Null if not a template skribi. */
	templateKey?: string 
	/** The uncompiled source string of this skribi's invocation. */
	source: string
	/** The hashed source string, used for style scoping. Null unless a style has been scoped to this skribi. */
	hash?: number
	// _hash?: number
	// get hash() {return this._hash ??= hash(this.source)}

	/** When a source is modified, the  */
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

	/** Provides the 'sk.child' object for the evaluation context. */
  public provideContext(): {} {
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

	/** Rerenders if the provided script file name is either marked as a script source or is null.
	 * @called by the scriptloader fileminder when a script file is modified. */
	public scriptsUpdated(id?: string) {
		if (this.plugin.settings.autoReload && (!isExtant(id) || this.sources.scripts.contains(id))) {
			this.rerender()
		}
	}

	/** Rerenders if provided plugin id is marked as a plugin source. No effect if autoReload is disabled.
	 * @called by the plugin listener when a plugin loads or unloads. 
	 * @param isPluginLoading If true, delays rerender by 100ms to give the plugin time to load. */
	public pluginUpdated(id: string, isPluginLoading?: boolean) {
		if (this.plugin.settings.autoReload && this.sources.integrations.contains(id)) {
			isPluginLoading ? setTimeout(() => this.rerender(), 100) : this.rerender()
		}
	}

	/** Rerenders if provided file name is marked as a style source. No effect if autoReload is disabled.
	 * @called by the template fileminder when a template file is modified. */
	public templatesUpdated(id: string, newId?: string) {	
		if (this.plugin.settings.autoReload && 
			((this?.templateKey == id) || this.sources.templates.contains(id))) 
			{
			dLog("Child received template update notification that matched one of its sources", id, this)
			this.rerender((id == this?.templateKey) ? id : null)
		}
	}

	/** Rerenders if provided file name is marked as a style source. No effect if autoReload is disabled.
	 * @called by the template fileminder when a style file is modified. */
	public stylesUpdated(id: string): void {
		if (this.plugin.settings.autoReload && this.sources.styles.contains(id)) {
			dLog("Child received style update notification that matched one of its sources", id, this)
			this.rerender()
		}
	}

	/** Marks a style or template file as a source, causing rerender to be invoked when that file is modified. */
	public listenFor(type: "style" | "template", id: string): void {
		const sourceArray = (type == "style" ? this.sources.styles : type == "template" ? this.sources.templates : null)
		sourceArray?.push(id)
	}

	setPacket(packet: Stringdex) {
		this.packet ??= packet
	}

	/** Reverts the container to its pre-rendering form, then unloads. 
	 * @called when the plugin is unloaded. */
	collapse(): void {
		let pre = createEl('code', {text: this.source})
		this.containerEl.replaceWith(pre)
		this.unload()
	}

	/** Unloads and reinvoke from processor entry point. Distinct from rerender, which reinvokes from renderSkribi(). */
	reset() {
		let pre = createEl('code', {text: this.source})
		this.containerEl.replaceWith(pre)
		this.unload()
		// console.log(this._entryPacket)
		// this._entryPacket[1] = this.containerEl.parentElement
		this.plugin.processor.processEntry(...this._entryPacket)
	}

	onload() {}

	onunload() {
		dLog("skreeb unload", this.containerEl);
		this.clear()
	}

	/** Clear responsibilities and retainers, prep for collection. */
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
		for (let cb of this.cbOnPost) {
			// TODO: ensure proper sync for onPosts
			cb[0](cb[1])
		};
	}

  /*-- Provider Functions --*/
	/* These functions are exposed in the evaluation context. */

	/** Creates and attaches a scoped style element from a provided CSS-parsable string.
	 * Will not resolve until the skribi has posted (completed synchronous evaluation and attached to the document).
	 * @returns a promise for the attached style element. */
	skAddStyle(styleContent: string, scope: boolean = true): Promise<HTMLStyleElement> {
		// TODO: check that the promise is collected if aborted before post
		let styleEl = createEl('style')
		styleEl.innerHTML = styleContent
		this.containerEl.prepend(styleEl)

		let p = () => {
			return new Promise((resolve, reject) => {
				this.skRegisterPost(() => {
					resolve(scope ? scopeStyle(this, this.containerEl, styleEl) : styleEl)})
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

interface SkChild {
	scriptsUpdated: (id?: string) => void
	sources: skChildSources
}

type skChildState = "pre" | "post" | "error"

/** Stores the sources for which a skribi should listen for modifications to. */
type skChildSources = {
	/** Template keys, not including the root template. */
	templates: string[],
	/** Style file names. */
	styles: string[],
	/** IDs of plugins to listen for load/unload events of. */
	integrations: string[],
	/** Script keys. */
	scripts: string[]
}