import { debounce, EventRef, Events, MarkdownPostProcessor, MarkdownPostProcessorContext, MarkdownRenderer, Plugin } from 'obsidian';
import { EtaHandler } from './eta';
import { DEFAULT_SETTINGS, SkribosSettings, SkribosSettingTab } from './settings';
import { registerMirror } from './overlay';
import { isExtant } from './util';

export default class SkribosPlugin extends Plugin {
	settings: SkribosSettings;
	eta: EtaHandler;
	varName: string = "sk";

	loadEvents = new Events();
	private initLoadRef: EventRef
	initLoaded: boolean = false;

	async onload() {
		console.log('Loading Skribos...');

		await this.loadSettings();
		this.addSettingTab(new SkribosSettingTab(this.app, this));

		this.eta = new EtaHandler(this);

		let process: MarkdownPostProcessor = async (el, ctx) => { this.processor(el, ctx) }
		process.sortOrder = -50
		this.registerMarkdownPostProcessor((el, ctx) => process(el, ctx))

		let bUpdate = debounce(this.eta.definePartials.bind(this.eta), 500, true)
		this.registerEvent(this.app.metadataCache.on('changed', e => {
			if (e?.parent.path.contains(this.settings.templateFolder)) bUpdate(e);
		}))

		this.initLoadRef = this.loadEvents.on('init-load-complete', () => {this.initLoaded = true; console.log("init-load-complete")})

		// registerMirror(this);
	}

	onunload() {
		this.loadEvents.offref(this.initLoadRef)
		console.log('Unloading Skribos...');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async processor (
		doc: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) {
		const elCodes = doc.querySelectorAll("code")
		elCodes.forEach(async (el) => {
			let t = window.performance.now();
			console.log("start:", t)
			try {
				preparseSkribi(el).then(async (src) => {
					if (src != null) {
						switch (src.flag.toString()) {
							case "1": { // Template
								this.predicate({el: el, src: src.text, ctx: ctx, t: t})
								break;
							} 
							case "2": {} // Interpolate
							case "3": {} // Literal
						}
					} 
				})
			} catch(e) {
				if (!e.flags.noRender) {
					renderError(el, e)
				}
			}
		})
	}

	async predicate(args: any) {
		if (!this.initLoaded) {
			console.log("not yet loaded")
			let el = renderWait(args.el)
			this.initLoadRef = this.loadEvents.on('init-load-complete', () => {
				this.initLoaded = true
				this.processSkribiTemplate(el, args.src, args.ctx, args.t)
			})
		} else {
			this.processSkribiTemplate(args.el, args.src, args.ctx, args.t)
		}
	}

	async processSkribiTemplate(el: HTMLElement, src: string, ctx: MarkdownPostProcessorContext, t: number): Promise<void> {
		let parsed: {id: string, args: any} = null;
		try { parsed = await parseSkribi(src) }
		catch (e) { renderError(el, e); return null }
		
		let template = this.eta.getPartial(parsed.id)
		if (!isExtant(template)) {renderError(el, {msg: `No such template "${parsed.id}"`}); return null }

		let file = this.app.metadataCache.getFirstLinkpathDest("", ctx.sourcePath)
		this.eta.renderAsync(template, parsed.args, file).then((rendered) => {
			let e = createDiv(); console.log(rendered)
			MarkdownRenderer.renderMarkdown(rendered, e, ctx.sourcePath, null)
			e.setAttribute("skribi", parsed.id)
			el.replaceWith(e); console.log("finish: ", t, window.performance.now())
			console.log(`Skribi "${parsed.id}" rendered in: ${window.performance.now()-t} ms`)
		})
	}
}

async function renderError(el: HTMLElement, e: any) {
	const pre = createEl("code", {cls: "skribi-error", text: "sk"})
	if (e?.msg) pre.setAttribute("title", e.msg);
	el.replaceWith(pre)
}

function renderWait(el: HTMLElement) {
	const pre = createEl("code", {cls: "skribi-wait", text: "sk"})
	el.replaceWith(pre)
	return pre
}

async function preparseSkribi(el: HTMLElement) {
	let text = el.textContent
	if (text.length < 3) return;

	let e = text.substr(text.length-2)
	let s = text.substr(0, 2)
	
	if (s.startsWith("{") && e.endsWith("}")) {
		if (s[1] == ":") { return {flag: 1, text: text.substring(2, text.length-1)}}
		else if (s[1] == "=") { return {flag: 2, text: text.substring(2, text.length-1)}}
		else if ((s == "{{") && (e == "}}")) {
			return {flag: 3, text: text.substring(2, text.length-2)}
		}
	} else return null
}

async function parseSkribi(src: string): Promise<{
	id: string,
	args: any
}> {
	let sa = src.split(/(?<![\\])\|/)
	let id = sa.splice(0, 1)[0].trim()

	let args: Record<string, string> = {};
	for (let seg of sa) {
		let si = seg.indexOf(":")
		if (si == -1) continue;
		args[seg.slice(0, si).trim()] = seg.slice(si+1).trim();
	}

	var tpCtx = {
		v: args	
	};
	console.log(args)

	return {id: id, args: tpCtx};
}

async function renderLiteral() {

}


