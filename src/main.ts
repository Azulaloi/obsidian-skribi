import { EventRef, Events, MarkdownPostProcessor, MarkdownPostProcessorContext, MarkdownRenderer, MarkdownView, Plugin } from 'obsidian';
import { EtaHandler } from './eta/eta';
import { DEFAULT_SETTINGS, SkribosSettings, SkribosSettingTab } from './settings';
import { dLog, getPreviewView, invokeMethodOf, invokeMethodWith, isExtant, roundTo, vLog } from './util';
import { embedMedia } from './render/embed';
import { Modes, Flags, EBAR } from './types/const';
import { ProcessorMode, SkContext, Stringdex, TemplateFunctionScoped } from './types/types';
import { SkribiChild } from './render/child';
import { preparseSkribi, parseSkribi } from './render/parse';
import { renderError, renderRegent, renderState, renderWait } from './render/regent';
import { SuggestionModal } from './modal/suggestionModal';
import { InsertionModal } from './modal/insertionModal';
import { TestModal } from './modal/testModal';
import { l } from './lang/babel';

export default class SkribosPlugin extends Plugin {
	settings: SkribosSettings;
	eta: EtaHandler;
	varName: string = "sk";

	loadEvents = new Events();
	private initLoadRef: EventRef
	initLoaded: boolean = false;

	l = l

	children: SkribiChild[] = [] // this leaks memory like a thing with holes that leaks a lot
	childProto: any = SkribiChild // for dev memory querying 

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

		this.initLoadRef = this.loadEvents.on('init-load-complete', () => {this.initLoaded = true; dLog("init-load-complete")})

		this.defineCommands()

		// registerMirror(this);

		/* Rerender any preview views */
		this.app.workspace.onLayoutReady(() => {
			this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
				if ((leaf.view as MarkdownView).currentMode.type == "preview") {
					(leaf.view as MarkdownView).previewMode.rerender(true)
				}
			})
		})
	}

	defineCommands() {
		this.addCommand({id: "insert-skribi", name: l['command.insert'], 
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

		this.addCommand({id: "reload-scripts", name: l['command.reloadScripts'], callback: () => {
			this.eta.bus.scriptLoader.reload().then(() => console.log("Skribi: Reloaded Scripts"));
		}})
		
		this.addCommand({id: "reload-skribis", name: "Reload Skribis", callback: () => {
			// invokeMethodWith<SkribiChild>(this.children, "rerender")
			this.children.forEach(child => child.rerender(child?.templateKey))
		}})

		this.addCommand({id: "test-performance", name: l['command.perfTest'], callback: async () => {
			let sel = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor?.getSelection()
			let clip = await window.navigator.clipboard.readText();
			let fill = (sel || clip) ? {
				type: l[sel ? 'modal.perf.autofill.selection' : 'modal.perf.autofill.clipboard'],
				value: sel ? sel : clip
			} : null
			
			new TestModal(this, fill).open()
		}})
	}
	
	onunload() {
		this.eta.unload()
		this.loadEvents.offref(this.initLoadRef)
		this.children.forEach((child) => {
			let pre = createEl('code', {text: child.source})
			child.containerEl.replaceWith(pre)
		})
		console.log('Skribi: Unloading...', this.children);  
		invokeMethodOf<SkribiChild>("unload", ...this.children)
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
					// this.renderSkribi(shell.createDiv(), view.getViewData(), "literal", ctx, {time: window.performance.now(), depth: d, flag: 4})
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
						let skCtx: SkContext = {time: window.performance.now(), depth: d, flag: src.flag, source: el.textContent}
						let nel = renderRegent(el, {class: 'sk-loading', hover: l['regent.loading.hover']})
						if (src.flag == 1) {
							proms.push(this.predicate({el: nel, src: src.text, mdCtx: ctx, skCtx: skCtx}));
							temps++;
						} else {
							proms.push(this.processSkribi(nel, src.text, ctx, skCtx))
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
					if (src != null) renderState(el, {hover: l['regent.stasis.hover'], class: 'stasis'})
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
		
		// Abort if being rendered in its own definition
		if (this.app.metadataCache.getFirstLinkpathDest("", mdCtx.sourcePath).basename == parsed.id) {
			renderRegent(el, {class: 'self', hover: l['regent.stasis.hover']}); return null; }

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
		let child = new SkribiChild(this, e)
		Object.assign(child, { 
			rerender: ((templateToRetrieve?: string) => {
				let nskCtx = Object.assign({}, skCtx, {time: window.performance.now()})
				if (skCtx.flag == 1 && isExtant(templateToRetrieve)) {
					let template = this.eta.getPartial(templateToRetrieve)
					child.unload();
					this.renderSkribi(e, template, templateToRetrieve, mdCtx, nskCtx)
				} else {
					child.unload(); 
					this.renderSkribi(e, con, id, mdCtx, nskCtx)
				}
			}).bind(this),
			templateKey: (skCtx.flag == 1) ? id : null,
			source: skCtx.source || null
		}) 
			
		let ctx = Object.assign({}, skCtx?.ctx || {}, {child: child.provideContext()})

		let [rendered, packet]: [string, Stringdex] = await this.eta.renderAsync(con, ctx, file).catch((err) => {
			if (this.settings.errorLogging) console.warn(`Skribi render threw error! Displaying content and error...`, EBAR, con, EBAR, err);
			renderError(el, (err?.hasData) ? err : {msg: err?.msg || err || "Render Error"})
			child.unload()
			return Promise.resolve(null)
		})
		
		dLog("renderSkrib:", el, mdCtx, skCtx, id)
		if (isExtant(rendered)) {
			let d = isExtant(mdCtx.remainingNestLevel) ? mdCtx.remainingNestLevel : (skCtx.depth)
			let render = MarkdownRenderer.renderMarkdown(rendered, e, mdCtx.sourcePath, null).then(() => {
				e.setAttribute("skribi", id); //e.setAttribute("depth", d.toString());
				e.removeClass("skribi-render-virtual")
				el.replaceWith(e); dLog("finish: ", skCtx.time, window.performance.now())
				if (skCtx.flag == 1) {
					vLog(`Rendered template "${id}" (${roundTo(window.performance.now()-skCtx.time, 4)} ms)`, e)
				} else vLog(`Rendered literal (f: ${skCtx.flag}) (${roundTo(window.performance.now()-skCtx.time, 4)} ms)`, e)
				return Promise.resolve(e);
			});

			child.setPacket(packet)
			mdCtx.addChild(child)
			this.children.push(child)
			
			render.then((e): Promise<any> => {
				child.onPost()

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

			return [render, child];
		} else {
			child.clear();
			return Promise.reject("Render Error");
		}
	}
}