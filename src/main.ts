import { debounce, EventRef, Events, MarkdownPostProcessor, MarkdownPostProcessorContext, MarkdownRenderer, Plugin } from 'obsidian';
import { EtaHandler } from './eta';
import { DEFAULT_SETTINGS, SkribosSettings, SkribosSettingTab } from './settings';
import { registerMirror } from './overlay';
import { isExtant } from './util';
import { embedMedia } from './embed';
import { TemplateFunction } from 'eta/dist/types/compile';

interface SkContext {
	time: number,
	flag: number,
	depth: number,
	ctx?: any
}

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
		ctx: MarkdownPostProcessorContext,
		depth?: number
	) {
		const elCodes = doc.querySelectorAll("code")
		elCodes.forEach(async (el) => {
			let t = window.performance.now();
			console.log("start:", t)
			try {
				preparseSkribi(el).then(async (src) => {
					if (src != null) {
						switch (src.flag) {
							case 1: { // Template
								this.predicate({el: el, src: src.text, mdCtx: ctx, skCtx: {time: t, depth: depth || 0, flag: src.flag}})
								break;
							} 
							case 2:
							case 3:
							case 4: {
								this.processSkribi(el, src.text, ctx, {time: t, depth: depth || 0, flag: src.flag})
								break;
							}
							default: //return Promise.reject("Invalid flag")
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
				return this.processSkribiTemplate(el, args.src, args.mdCtx, args.skCtx)
			})
		} else return this.processSkribiTemplate(args.el, args.src, args.mdCtx, args.skCtx)
	}

	async processSkribiTemplate(
		el: HTMLElement, 
		src: string, 
		mdCtx: MarkdownPostProcessorContext, 
		skCtx: SkContext
	): Promise<void> {
		let parsed: {id: string, args: any} = null;
		try { parsed = await parseSkribi(src) }
		catch (e) { renderError(el, e); return null }
		
		let template = this.eta.getPartial(parsed.id)
		if (!isExtant(template)) {renderError(el, {msg: `No such template "${parsed.id}"`}); return null }
		this.renderSkribi(el, template, parsed.id, mdCtx, Object.assign({}, skCtx, {ctx: parsed.args}));
	}

	async processSkribi(
		el: HTMLElement, 
		src: string, 
		mdCtx: MarkdownPostProcessorContext, 
		skCtx: SkContext
	): Promise<void> {
		const prep = function (str: string, flag: number) {
			switch (flag) { 
				case 2: return `<%=${src}%>`; 
				case 3: return `<%~${src}%>`; 
				case 4: return str;
			} 
		}

		this.renderSkribi(el, prep(src, skCtx.flag), "literal", mdCtx, skCtx)
	}

	async renderSkribi(
		el: HTMLElement, 
		con: string | TemplateFunction, 
		id: string, 
		mdCtx: MarkdownPostProcessorContext, 
		skCtx: SkContext
	): Promise<void> {
		let file = this.app.metadataCache.getFirstLinkpathDest("", mdCtx.sourcePath)
		let rendered = await this.eta.renderAsync(con, skCtx?.ctx || {}, file).then((rendered) => {
			return Promise.resolve(rendered)
		}, (err) => {
			renderError(el, {msg: err || "Render Error"})
			return Promise.resolve(null)
		})

		if (isExtant(rendered)) {
			let e = createDiv();
			MarkdownRenderer.renderMarkdown(rendered, e, mdCtx.sourcePath, null).then(() => {
				e.setAttribute("skribi", id)
				el.replaceWith(e); console.log("finish: ", skCtx.time, window.performance.now())
				console.log(`Skribi "${id}" rendered in: ${window.performance.now()-skCtx.time} ms`)
				return Promise.resolve(e);
			})
			.then(() => {return Promise.resolve(embedMedia(e, mdCtx.sourcePath, this))})
			.then((e) => this.processor(e, mdCtx))
		} else {
			// return Promise.reject("Render Error");
		}
	}
}

async function preparseSkribi(el: HTMLElement) {
	let text = el.textContent
	if (text.length < 3) return;

	let e = text.substr(text.length-2)
	let s = text.substr(0, 2)
	
	if (s.startsWith("{") && e.endsWith("}")) {
		let f = s[1];
		let flag = (f == ":") ? 1 : (f == "=") ? 2 : (f == "~") ? 3 : (f == "{") ? 4 : -1;
		if ((flag > 0) && (flag != 4 || (e == "}}"))) {
			return {flag: flag, text: text.substring(2, text.length - (flag == 4 ? 2 : 1 ))}
		} else return
	} else return
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
