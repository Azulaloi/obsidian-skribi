import { EventRef, MarkdownRenderChild } from "obsidian";
import { Stringdex } from "src/types/types";
import { dLog } from "src/util";

export class SkribiChild extends MarkdownRenderChild {
	packet: Stringdex
	intervals: number[] = [];

	cbOnUnload: [Function, any][] = []
	cbOnPost: [Function, any][] = []

	constructor(el: HTMLElement) {
		super(el)
	}

  provideContext() {
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

	setPacket(packet: Stringdex) {
		if (this.packet == null) {
			this.packet = packet;
		}
	}

	onload() {}

	clear() {
		dLog("skreeb clear")
		for (let i of this.intervals) window.clearInterval(i); // there might be cases where this doesn't get called properly
		for (let cb of this.cbOnUnload) cb[0](cb[1]);
	}

	onunload() {
		dLog("skreeb unload")
		this.clear()
	}

	onPost() {
		for (let cb of this.cbOnPost) cb[0](cb[1]);
	}

  /* Provider Functions */
  
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
  rerender() {}
}