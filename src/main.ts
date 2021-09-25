import { debounce, EventRef, Events, MarkdownPostProcessor, MarkdownPostProcessorContext, MarkdownPreviewView, MarkdownRenderChild, MarkdownRenderer, MarkdownSectionInformation, MarkdownView, Plugin, TAbstractFile, TFile } from 'obsidian';
import { EtaHandler } from './eta/eta';
import { DEFAULT_SETTINGS, SkribosSettings, SkribosSettingTab } from './settings';
import { dLog, getPreviewView, isExtant, isFile, roundTo, vLog } from './util';
import { embedMedia } from './render/embed';
import { Modes, Flags, EBAR } from './types/const';
import { ProcessorMode, SkContext, Stringdex, TemplateFunctionScoped } from './types/types';
import { InsertionModal, SuggestionModal } from './modal';
import { SkribiChild } from './render/child';
import { preparseSkribi, parseSkribi } from './render/parse';
import { renderError, renderRegent, renderState, renderWait } from './render/regent';

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

		let process: MarkdownPostProcessor = async (el, ctx) => { this.processor({srcType: Modes.general}, el, ctx, ) }
		// process.sortOrder = -50
		this.registerMarkdownPostProcessor((el, ctx) => process(el, ctx))

		let processBlock = async (mode: ProcessorMode, str: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => { this.processor(mode, el, ctx, null, null, str.trimEnd()) }
		
		([["normal", "", Flags.none], ["raw", "-raw", Flags.raw], ["literal", "-lit", Flags.literal], ["interpolate", "-int", Flags.interp], ["evaluate", "-eval", Flags.eval]])
		.forEach((v) => {
			this.registerMarkdownCodeBlockProcessor(`skribi${v[1]}`, processBlock.bind(this, {srcType: Modes.block, flag: v[2]}))
			this.registerMarkdownCodeBlockProcessor(`sk${v[1]}`, processBlock.bind(this, {srcType: Modes.block, flag: v[2]}))
		})

		this.registerEvent(this.app.metadataCache.on('changed', e => {
			// if (e?.parent.path.contains(this.settings.templateFolder)) { bUpdate(e); }
		}))

		this.initLoadRef = this.loadEvents.on('init-load-complete', () => {this.initLoaded = true; dLog("init-load-complete")})

		this.addCommand({id: "insert-skribi", name: "Insert Skribi", 
			editorCallback: (editor, view) => {
				if (!this.initLoaded) return;
				let x = new SuggestionModal(this);
				new Promise((resolve: (value: string) => void, reject: (reason?: any) => void) => x.openAndGetValue(resolve, reject))
				.then(result => {
					if (this.eta.hasPartial(result)) {
						let i = new InsertionModal(this, editor, result)
						i.open();
					}
				}, (r) => {});
			}})

		/* Run bulk skribi rendering to test processing times */
		if (false) this.addCommand({id: "skribi-test", name: 'Skribi Test', editorCallback: async (editor, view) => {
			let container = createDiv()
			let el = createDiv()

			let d = createDiv()

			let primes: HTMLElement[] = []
			for (let i = 0; i < 100; i++) {
				// let d = createDiv()
				d.createEl('code', {text: editor.getSelection()})
				// primes.push(d)
			}
			primes.push(d)
			let tx = window.performance.now()

			// console.log(primes)
			const proms = primes.map(async (div) => {
				let t1 = window.performance.now()

				let p = await this.processor({srcType: Modes.general}, div, {
					remainingNestLevel: 4,
					docId: '55555555',
					frontmatter: null,
					sourcePath: view.file.path,
					addChild: (child: any) => {},
					getSectionInfo: () => {return null as MarkdownSectionInformation},
					containerEl: container,
					el: el
				}, 4, false, null).catch(() => {})

				return [p, window.performance.now(), t1]
			})

			let vals = await Promise.allSettled(proms)

			console.log('tests settled in:', window.performance.now()-tx)

			let en = vals.map((v) => {if (v.status == 'fulfilled') return v.value})

			let times = []
			for (let res of en) {
				let timeDiff = res[1] as number - (res[2] as number)
				times.push(timeDiff)
			}

			let l = times.length
			let a = times.reduce((v, c) => {return v+c})

			console.log(`avg time of ${l}: ${a/l}`)
		}})

		
		// registerMirror(this);
	}
	
	onunload() {
		this.eta.unload()
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
		mode: ProcessorMode, // 0: codespan; 1: codeblock;
		doc: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		depth?: number,
		self?: boolean,
		srcIn?: string
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


		/* Dispatch render promises */
		var proms: Promise<any>[] = []
		var temps = 0;
		const elCodes = (mode.srcType == Modes.block) ? [doc] : doc.querySelectorAll("code")
		if (!(d <= 0)) {
			if (false) { // not sure the template preview idea is feasible
				let f = this.app.metadataCache.getFirstLinkpathDest('', ctx.sourcePath)
				if (this.settings.templateFolder.contains(f.parent.path)) {
					console.log('check')
				
					let view = getPreviewView(this.app) as MarkdownView
					let editor = getPreviewView(this.app, true)?.editor || null

					let pe = view.previewMode.renderer.previewEl
					pe.empty()
				
					let shell = pe.createDiv({cls: 'skribi-template-preview', attr: {'depth': d}})
					this.renderSkribi(shell.createDiv(), view.getViewData(), "literal", ctx, {time: window.performance.now(), depth: d, flag: 4})
				}
			}

			let tm = window.performance.now();
			const elProms = Array.from(elCodes).map(async (el) => {
				let t = window.performance.now();
				dLog("start:", t)
				
				let src = (isExtant(mode.flag) && mode.flag != Flags.none) ?
					{text: srcIn || doc.textContent, flag: mode.flag} : await preparseSkribi(el);

				try {
					if (src != null) {
						let nel = renderRegent(el, {class: 'sk-loading', hover: 'Evaluating...'})
						
						if (src.flag == 1) {
							proms.push(this.predicate({el: nel, src: src.text, mdCtx: ctx, skCtx: {time: window.performance.now(), depth: d, flag: src.flag}}));
							temps++;
						} else {
							proms.push(this.processSkribi(nel, src.text, ctx, {time: window.performance.now(), depth: d, flag: src.flag}))
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

			await Promise.allSettled(elProms)

			return proms

		} else {
			/* Depth too high! */

			elCodes.forEach(async (el) => {
				preparseSkribi(el).then(async (src) => {
					if (src != null) renderState(el, {hover: "Recursion limit reached!", class: 'stasis'})
				})
			})
			dLog("processor hit limit"); 
			
			return Promise.resolve('Depth Limit'); 
		}
	}

	/* Await initial loading of templates */
	async predicate(args: any) {
		let el = renderWait(args.el)

		if (!this.initLoaded) {
			dLog("not yet loaded")
			this.initLoadRef = this.loadEvents.on('init-load-complete', async () => {
				this.initLoaded = true
				return await this.processSkribiTemplate(el, args.src, args.mdCtx, Object.assign(args.skCtx, {time: window.performance.now()}))
			})
		} else return await this.processSkribiTemplate(el, args.src, args.mdCtx, args.skCtx)
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
			renderRegent(el, {class: 'self', hover: 'Self Render Prohibited'}); return null; }
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
				case 5: return `<%${src}%>`;
			} 
		}

		return this.renderSkribi(el, prep(src, skCtx.flag), "literal", mdCtx, skCtx)
	}

	async renderSkribi(
		el: HTMLElement, 
		con: string | TemplateFunctionScoped, 
		id: string, 
		mdCtx: MarkdownPostProcessorContext, 
		skCtx: SkContext
	): Promise<any> {
		let file = this.app.metadataCache.getFirstLinkpathDest("", mdCtx.sourcePath)

		let e = createDiv({cls: "skribi-render-virtual"});
		let c = new SkribiChild(e)
		Object.assign(c, { rerender: (() => {
				console.log("e"); 
				c.clear(); 
				this.renderSkribi(e, con, id, mdCtx, skCtx)}).bind(this)
			}) 
			
		let ctx = Object.assign({}, skCtx?.ctx || {}, {child: c.provideContext()})

		let [rendered, packet]: [string, Stringdex] = await this.eta.renderAsync(con, ctx, file).catch((err) => {
			if (this.settings.errorLogging) console.warn(`Skribi render threw error! Displaying content and error...`, EBAR, con, EBAR, err);
			renderError(el, (err?.hasData) ? err : {msg: err?.msg || err || "Render Error"})
			c.unload()
			return Promise.resolve(null)
		})
		
		dLog("renderSkrib:", el, mdCtx, skCtx, id)
		if (isExtant(rendered)) {
			let d = isExtant(mdCtx.remainingNestLevel) ? mdCtx.remainingNestLevel : (skCtx.depth)
			let r = MarkdownRenderer.renderMarkdown(rendered, e, mdCtx.sourcePath, null).then(() => {
				e.setAttribute("skribi", id); //e.setAttribute("depth", d.toString());
				e.removeClass("skribi-render-virtual")
				el.replaceWith(e); dLog("finish: ", skCtx.time, window.performance.now())
				if (skCtx.flag == 1) {
					vLog(`Rendered template "${id}" (${roundTo(window.performance.now()-skCtx.time, 4)} ms)`, e)
				} else vLog(`Rendered literal (f: ${skCtx.flag}) (${roundTo(window.performance.now()-skCtx.time, 4)} ms)`, e)
				return Promise.resolve(e);
			});

			c.setPacket(packet)
			mdCtx.addChild(c);
			
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
				this.processor({srcType: Modes.general}, e, mdCtx, skCtx.depth-1, true) /* Recurse the processor to parse skreeblings */
			})

			return r;
		} else {
			c.clear();
			return Promise.reject("Render Error");
		}
	}
}