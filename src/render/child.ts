import { EventRef, MarkdownRenderChild } from "obsidian";
import SkribosPlugin from "src/main";
import { Stringdex } from "src/types/types";
import { dLog } from "src/util";

interface SkChild {
	scriptsUpdated: () => any
}

export class SkribiChild extends MarkdownRenderChild implements SkChild {
	private plugin: SkribosPlugin

	packet: Stringdex
	private intervals: number[] = [];
	private cbOnUnload: [Function, any][] = []
	private cbOnPost: [Function, any][] = []

	templateKey?: string
	source?: string

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
		dLog("skreeb unload"); console.log("skreeb unload");
		this.clear()
	}

	/* Called by rerender. */
	clear() {
		dLog("skreeb clear")
		for (let i of this.intervals) window.clearInterval(i); // there might be cases where this doesn't get called properly (?)
		for (let cb of this.cbOnUnload) cb[0](cb[1]);

		// No idea how to do memory management properly so let's just burn all the bridges we can find
		console.log("dying")
		// this.containerEl.parentNode.removeChild(this.containerEl)
		this.plugin.children.remove(this)
	}

	/* Called after render fulfillment */
	onPost() {
		for (let cb of this.cbOnPost) cb[0](cb[1]);
	}

  /*-- Provider Functions --*/
  
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
		this.cbOnPost.push([(...x: any) => cb(...x), args])
	}

  // Assigned in renderSkribi()
  rerender(...args: any[]) {}
}