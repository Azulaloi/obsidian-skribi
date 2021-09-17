import { EventRef, MarkdownRenderChild } from "obsidian";
import { Stringdex } from "src/types";

export class SkribiChild extends MarkdownRenderChild {
	packet: Stringdex
	intervals: number[] = [];

	cbOnUnload: [Function, any][] = []
	
	constructor(el: HTMLElement) {
		super(el)
	}

  provideContext() {
    return {
      el: this.containerEl,
      registerInterval: this.skRegisterInterval.bind(this),
      registerUnload: this.registerUnload.bind(this),
      registerEvent: this.skRegisterEvent.bind(this),
      reload: this.rerender,
      c: this
    }
  }

	setPacket(packet: Stringdex) {
		if (this.packet == null) {
			this.packet = packet;
		}
	}

	onload() {

	}


	clear() {
		console.log("skreeb clear")
		for (let i of this.intervals) window.clearInterval(i); // there might be cases where this doesn't get called properly
		for (let cb of this.cbOnUnload) cb[0](cb[1]);
	}

	onunload() {
		console.log("skreeb unload")
		this.clear()
	}

  /* To Provide */

  skRegisterInterval(cb: Function, time: number, ...args: any[]) {
		let x = window.setInterval((...x: any) => cb(...x), time * 1000, ...args)
		this.intervals.push(x)
		return x;
	}

  skRegisterEvent(event: EventRef) {
    console.log('sk regevent:', event)
    this.registerEvent(event)
  }

	registerUnload(cb: Function, ...args: any[]) {
		this.cbOnUnload.push([(...x: any) => cb(...x), args])
	}

  // Assigned in renderSkribi()
  rerender() {}
}