import { debounce, EventRef, Events, MarkdownPostProcessor, MarkdownPostProcessorContext, MarkdownRenderer, Plugin } from 'obsidian';
import { EtaHandler } from './eta';
import { DEFAULT_SETTINGS, SkribosSettings, SkribosSettingTab } from './settings';
import { registerMirror } from './overlay';
import { dLog, isExtant, roundTo, vLog } from './util';
import { embedMedia } from './embed';
import { TemplateFunction } from 'eta/dist/types/compile';

declare module "obsidian" {
	interface MarkdownPostProcessorContext {
		containerEl: HTMLElement;
		el: HTMLElement;
		remainingNestLevel: number;
	}
}

interface SkContext {
	time: number,
	flag: number,
	depth: number,
	ctx?: any
}

const SK_DEPTH_LIMIT = 5;

export default class SkribosPlugin extends Plugin {
	settings: SkribosSettings;
	eta: EtaHandler;
	varName: string = "sk";

	loadEvents = new Events();
	private initLoadRef: EventRef
	initLoaded: boolean = false;

	async onload() {
		console.log('Skribi: Loading...');

		await this.loadSettings();
		this.addSettingTab(new SkribosSettingTab(this.app, this));

		this.eta = new EtaHandler(this);

		let process: MarkdownPostProcessor = async (el, ctx) => { this.processor(el, ctx) }
		// process.sortOrder = -50
		this.registerMarkdownPostProcessor((el, ctx) => process(el, ctx))

		let bUpdate = debounce(this.eta.definePartials.bind(this.eta), 500, true)
		this.registerEvent(this.app.metadataCache.on('changed', e => {
			if (e?.parent.path.contains(this.settings.templateFolder)) bUpdate(e);
		}))

		this.initLoadRef = this.loadEvents.on('init-load-complete', () => {this.initLoaded = true; dLog("init-load-complete")})

		// registerMirror(this);
	}

	onunload() {
		this.loadEvents.offref(this.initLoadRef)
		console.log('Skribi: Unloading...');
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
		depth?: number,
		self?: boolean
	) {
		let nestExtant = isExtant(ctx.remainingNestLevel)
		let nestLevel = nestExtant ? ctx.remainingNestLevel : null;
		/* nestExtant means that we are inside of a natural transclusion */

		self = isExtant(self)
		depth = self ? depth : null
		/* self means that we have been called by renderSkribi, to look for codeblocks */

		let elHasDepth = isExtant(doc.getAttribute("depth"))
		let elElHasDepth = isExtant(ctx.el.getAttribute("depth"))
		let elDepth = elHasDepth ? parseInt(doc.getAttribute("depth")) : elElHasDepth ? parseInt(ctx.el.getAttribute("depth")) : null;
		/* Used for passing depth to virtual elements (we may be in one even as we speak...)*/

		/* determine our depth condition type */
		let d = self ? depth : (elHasDepth || elElHasDepth) ? elDepth : nestExtant ? nestLevel : 0

		if (!nestExtant && !(elHasDepth || elElHasDepth)) dLog("processor sees no depth")

		if (elHasDepth) { 
			dLog("elDepth", elDepth, "doc", doc, "el", ctx.el, "conEl", ctx.containerEl) 
		} else {
			dLog("processor: ", "doc", doc, "el", ctx.el, "conEl", ctx.containerEl, "nest", ctx.remainingNestLevel)
		}

		var proms: Promise<any>[] = []
		var temps = 0;
		const elCodes = doc.querySelectorAll("code")
		if (!(d <= 0)) {
			let tm = window.performance.now();

			// elCodes.forEach(/*async*/ (el) => {
			const elProms = Array.from(elCodes).map(async (el) => {
				let t = window.performance.now();
				dLog("start:", t)

				let src = await preparseSkribi(el)
				try {
					if (src != null) {
						el.addClass("skribi-loading") // is this ever visible?
						switch (src.flag) {
							case 1: { // Template
								proms.push(this.predicate({el: el, src: src.text, mdCtx: ctx, skCtx: {time: window.performance.now(), depth: d, flag: src.flag}}));
								temps++;
								break;
							} 
							case 2:
							case 3:
							case 4: {
								proms.push(this.processSkribi(el, src.text, ctx, {time: window.performance.now(), depth: d, flag: src.flag}))
								break;
							}
							default: //return Promise.reject("Invalid flag")
						}
					} 
				} catch(e) {
					if (!e.flags.noRender) {
						renderError(el, e)
					}
				}

				return Promise.resolve()
			})

		
			if (/*!self && */!doc.hasClass("skribi-render-virtual")) {
				let aps = Promise.all(elProms)
				aps.then(() => {
					Promise.allSettled(proms).then(() => {
						if (proms.length > 0) {
							if (this.initLoaded) {
								vLog(`Processed ${proms.length} skribis (${roundTo((window.performance.now()-tm), 4)} ms) in Element`, doc)
							} else {
								let str = "";
								if (temps > 0) {
									if (proms.length - temps > 0) {
										str = `Processed ${proms.length-temps} and queued ${temps} skribis`;
									} else str = `Queued ${temps} skribis`;
								} else str = `Processed ${proms.length-temps} skribis`;

								vLog(str + ` (${roundTo((window.performance.now()-tm), 4)} ms) in Element`, doc)
							}
						}
					})
				})
			}

		} else {
			elCodes.forEach(async (el) => {
				preparseSkribi(el).then(async (src) => {
					if (src != null) renderFrozen(el, src.text)
				})
			})
			dLog("processor hit limit"); return; 
		}
	}

	/* Await initial loading of templates */
	async predicate(args: any) {
		if (!this.initLoaded) {
			dLog("not yet loaded")
			let el = renderWait(args.el)
			this.initLoadRef = this.loadEvents.on('init-load-complete', async () => {
				this.initLoaded = true
				return await this.processSkribiTemplate(el, args.src, args.mdCtx, Object.assign(args.skCtx, {time: window.performance.now()}))
			})
		} else return await this.processSkribiTemplate(args.el, args.src, args.mdCtx, args.skCtx)
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
		
		if (this.app.metadataCache.getFirstLinkpathDest("", mdCtx.sourcePath).basename == parsed.id) {
			el.addClass("skribi-self"); el.removeClass("skribi-loading", "skribi-wait"); return null; }
		let template = this.eta.getPartial(parsed.id)
		if (!isExtant(template)) {
			if (this.eta.failedTemplates.has(parsed.id)) { renderError(el, {msg: `Template ${parsed.id} failed to compile, error: \n` + this.eta.failedTemplates.get(parsed.id)}) }
			else {renderError(el, {msg: `No such template "${parsed.id}"`})}
			return null 
		}
		return this.renderSkribi(el, template, parsed.id, mdCtx, Object.assign({}, skCtx, {ctx: parsed.args}));
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

		return this.renderSkribi(el, prep(src, skCtx.flag), "literal", mdCtx, skCtx)
	}

	async renderSkribi(
		el: HTMLElement, 
		con: string | TemplateFunction, 
		id: string, 
		mdCtx: MarkdownPostProcessorContext, 
		skCtx: SkContext
	): Promise<any> {
		let file = this.app.metadataCache.getFirstLinkpathDest("", mdCtx.sourcePath)
		let rendered = await this.eta.renderAsync(con, skCtx?.ctx || {}, file).then((rendered) => {
			return Promise.resolve(rendered)
		}, (err) => {
			renderError(el, {msg: err || "Render Error"})
			return Promise.resolve(null)
		})

		dLog("renderSkrib:", el, mdCtx, skCtx)
		if (isExtant(rendered)) {
			let d = isExtant(mdCtx.remainingNestLevel) ? mdCtx.remainingNestLevel : (skCtx.depth)
			let e = createDiv({cls: "skribi-render-virtual"}); // e.setAttribute("depth", d.toString())
			let r = MarkdownRenderer.renderMarkdown(rendered, e, mdCtx.sourcePath, null).then(() => {
				e.setAttribute("skribi", id); //e.setAttribute("depth", d.toString());
				e.removeClass("skribi-render-virtual")
				el.replaceWith(e); dLog("finish: ", skCtx.time, window.performance.now())
				if (skCtx.flag == 1) {
					vLog(`Rendered template "${id}" (${roundTo(window.performance.now()-skCtx.time, 4)} ms)`, e)
				} else vLog(`Rendered literal (f: ${skCtx.flag}) (${roundTo(window.performance.now()-skCtx.time, 4)} ms)`, e)
				return Promise.resolve(e);
			});

			r.then((e): Promise<any> => {
				// TODO: only restrict depth for transclusions
				if (isExtant(mdCtx.remainingNestLevel) && (mdCtx.remainingNestLevel > 0) || !isExtant(mdCtx.remainingNestLevel)) {
					return embedMedia(e, mdCtx.sourcePath, this, skCtx.depth) 
				} else return Promise.resolve()
				//e.setAttribute("depth", d.toString())

			})
			.then((x) => {
				dLog("renderer final: ", d)
				// e.setAttribute("depth", d.toString())
				this.processor(e, mdCtx, skCtx.depth-1, true) /* Recurse the processor to parse skreeblings */
			})

			return r;
		} else {
			return Promise.reject("Render Error");
		}
	}
}

/* Check if code block is that good good and if so what type of good good */
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

/* Parse arguments for template skreebs */
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
	// console.log(args)

	return {id: id, args: tpCtx};
}

async function renderError(el: HTMLElement, e: any) {
	const pre = createEl("code", {cls: "skribi-error", text: "sk"})
	el.removeClass("skribi-loading", "skribi-wait")
	if (e?.msg) pre.setAttribute("title", e.msg);
	el.replaceWith(pre)
}

function renderWait(el: HTMLElement) {
	const pre = createEl("code", {cls: "skribi-wait", text: "sk"})
	el.replaceWith(pre)
	return pre
}

async function renderFrozen(el: HTMLElement, src: string) {
	el.removeClass("skribi-loading", "skribi-wait")
	el.addClass("skribi-frozen")
	el.setAttribute("title", "Recursion limit reached!")
}
