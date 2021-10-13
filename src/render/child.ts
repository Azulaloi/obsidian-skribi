import { EventRef, MarkdownRenderChild } from "obsidian";
import SkribosPlugin from "src/main";
import { Stringdex } from "src/types/types";
import { dLog, vLog } from "src/util";
import { scopeStyle } from "./processor";

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
			dLog("Child received matching template update signal", id, this)
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
		dLog("skreeb unload", this.containerEl);
		this.clear()
	}

	/* Called by rerender. */
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