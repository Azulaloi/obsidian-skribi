import { MarkdownPostProcessor, MarkdownPostProcessorContext, MarkdownRenderer } from "obsidian";
import { logError, SkribiAbortError, SkribiError, SkribiImportError } from "src/engine/error";
import { Handler } from "src/engine/handler";
import { l } from "src/lang/babel";
import SkribosPlugin from "src/main";
import { Modes, Flags, EBAR, CLS, REGENT_CLS } from "src/types/const";
import { ProcessorMode, queuedTemplate, SkContext, SkribiResult, Stringdex, TemplateFunctionScoped } from "src/types/types";
import { isExtant, dLog, vLog, roundTo } from "src/util/util";
import { SkribiChild } from "./child";
import { embedMedia } from "./embed";
import { parseSkribi, preparseSkribi } from "./parsing";
import { renderRegent, renderError, renderState } from "./regent";
import { scopeStyle, stripStyleFromString } from "./style/style";

/** The processor is the render core. It handles the post-processing chain. */
export default class SkribiProcessor {
  plugin: SkribosPlugin
  eta: Handler

  constructor(plugin: SkribosPlugin) {
    this.plugin = plugin
    this.eta = plugin.handler
  }

  /** Register our markdown processors. */
  public registerProcessors(): void {
    const processCodeSpan: MarkdownPostProcessor = async(el, ctx) => {this.processEntry({srcType: Modes.general}, el, ctx)}
		this.plugin.registerMarkdownPostProcessor((el, ctx) => processCodeSpan(el, ctx))

    const processCodeBlock = async (mode: ProcessorMode, str: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => { this.processEntry(mode, el, ctx, null, null, str.trimEnd()) }
    ([["normal", "", Flags.none], ["raw", "-raw", Flags.raw], ["literal", "-lit", Flags.literal], ["interpolate", "-int", Flags.interp], ["evaluate", "-eval", Flags.eval], 
			// ["invocation", "-inv", Flags.template]
		])
		.forEach((v) => {
			this.plugin.registerMarkdownCodeBlockProcessor(`skribi${v[1]}`, processCodeBlock.bind(this, {srcType: Modes.block, flag: v[2]}))
			this.plugin.registerMarkdownCodeBlockProcessor(`sk${v[1]}`, processCodeBlock.bind(this, {srcType: Modes.block, flag: v[2]}))
		})
  }

  /** Entry to the Skribi process chain. Called:
   * - By MarkdownView on each block of a markdown preview
   * - By MarkdownView on code blocks of our register language types
   * - By SkribiProcessor.renderSkribi() to recurse nested skribis 
	 * - By SkribiChild to reset itself */
  public async processEntry (
		mode: ProcessorMode, // 0: codespan; 1: codeblock;
		doc: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		depth?: number,
		self?: boolean,
		srcIn?: string
	): Promise<Promise<SkribiResult>[] | null> {
		let entryPacket = [mode, doc, ctx, depth, self, srcIn] // Stores invocation data

		/*- Depth Determination -*/

		let nestExtant = isExtant(ctx.remainingNestLevel)
		let nestLevel = nestExtant ? ctx.remainingNestLevel : null;
		// nestExtant means that we are inside of a natural transclusion

		self = isExtant(self)
		depth = self ? depth : null
		// self means that we have been called by renderSkribi, to look for codeblocks

		let elHasDepth = isExtant(doc.getAttribute("depth"))
		let elElHasDepth = isExtant(ctx.el.getAttribute("depth"))
		let elDepth = elHasDepth ? parseInt(doc.getAttribute("depth")) : elElHasDepth ? parseInt(ctx.el.getAttribute("depth")) : null;
		// Used for passing depth to virtual elements (we may be in one even as we speak...)

		// determine our depth condition type
		let d = self ? depth : (elHasDepth || elElHasDepth) ? elDepth : nestExtant ? nestLevel : 0

		if (!nestExtant && !(elHasDepth || elElHasDepth)) dLog("processor sees no depth");

		if (elHasDepth) { 
			dLog("elDepth", elDepth, "doc", doc, "el", ctx.el, "conEl", ctx.containerEl) 
		} else {
			dLog("processor: ", "doc", doc, "el", ctx.el, "conEl", ctx.containerEl, "nest", ctx.remainingNestLevel)
		}
		/*- End Depth Determination -*/


		/* Dispatch render promises */
		var proms: Promise<SkribiResult>[] = []
		var tproms: Promise<SkribiResult>[] = []
		var temps = 0;
		const elCodes = (mode.srcType == Modes.block) ? [doc] : doc.querySelectorAll("code")
		if (!(d <= 0)) {
			let tm = window.performance.now();
			const elProms = Array.from(elCodes).map(async (el) => {
				if (el.matches('.no-skribi')) return Promise.resolve();
				let t = window.performance.now();
				dLog("start:", t)
				
				let src = (isExtant(mode.flag) && mode.flag != Flags.none) ?
					{text: srcIn || doc.textContent, flag: mode.flag} : await preparseSkribi(el);

				let originalText = (mode.srcType == Modes.block) ? srcIn : el.textContent

				try {
					if (src != null) {
						let skCtx: SkContext = {time: window.performance.now(), depth: d, flag: src.flag, source: originalText, entryPacket: entryPacket as any}
						let nel = renderRegent(el, {class: REGENT_CLS.eval, hover: l['regent.loading.hover']})
						if (src.flag == 1) {
							tproms.push(this.awaitTemplatesLoaded({el: nel, src: src.text, mdCtx: ctx, skCtx: skCtx})
								.catch(e => {console.warn(`Skribi: Dispatch Errored (Template)`, EBAR, e)})
							);
							temps++;
						} else {
							proms.push(this.processSkribi(nel, src.text, ctx, skCtx)
								.catch(e => {console.warn(`Skribi: Dispatch Errored`, EBAR, e)})
							);
						}
					} 
				} catch(e) {
					if (!e.flags.noRender) {
						renderError(el, e)
					}
				}

				return Promise.resolve()
			})
		
			await Promise.allSettled(elProms)

			if ((!this.plugin.initLoaded) && tproms.length > 0) {
				vLog(`Queued ${tproms.length} templates`)
			}

			return proms.concat(tproms)
		} else {
			/* Depth too high! */
			elCodes.forEach(async (el) => {
				preparseSkribi(el).then(async (src) => {
					if (src != null) {
						renderState(el, {class: REGENT_CLS.stasis, hover: l['regent.stasis.hover'], noRegent: true,})
						// renderRegent(el, {class: REGENT_CLS.stasis, hover: l['regent.stasis.hover']})
					}
				})
			})
			dLog("processor hit limit"); 
			return Promise.resolve(null); // Postprocessor calls are not caught so we can't reject neatly.
		}
	}

  private queuedTemplates: Array<queuedTemplate> = []

  /** Queues templates to process on initial template load completion, or processes them immediately if ready. */
	private async awaitTemplatesLoaded(args: {el: HTMLElement, src: any, mdCtx: MarkdownPostProcessorContext, skCtx: SkContext}): Promise<SkribiResult> {
		if (isExtant(this.plugin.handler.loader.initError)) {
			// The template loader has errored and will not initialize, so continue rendering immediately.
			return await this.processSkribiTemplate(args.el, args.src, args.mdCtx, args.skCtx)
		}
		
		let el = this.plugin.initLoaded 
			? renderRegent(args.el, {class: REGENT_CLS.eval, hover: l['regent.loading.hover'], clear: true})
			: renderRegent(args.el, {class: REGENT_CLS.wait, hover: l["regent.wait.hover"], clear: true})

		return (this.plugin.initLoaded) 
			? await this.processSkribiTemplate(el, args.src, args.mdCtx, args.skCtx)
			: new Promise((resolve, reject) => {
					let activate = (ele: HTMLElement, time: number) => { resolve(
						this.processSkribiTemplate(ele, args.src, args.mdCtx, Object.assign(args.skCtx, {time: time}))
					)}
					this.queuedTemplates.push({function: activate as any, element: el})
				})
	}

  /** Called on template init load complete. Fires off all of the queued templates. */
  public templatesReady(): void {
    let proms = this.queuedTemplates.map((queued) => {
			let el = renderRegent(queued.element, {class: REGENT_CLS.eval, hover: l['regent.loading.hover']})
			return queued.function(el, window.performance.now())
		})
    Promise.allSettled(proms).then(() => {this.queuedTemplates = []})
  }

	/** Parse variables and prep the template */
	private async processSkribiTemplate(
		el: HTMLElement, 
		src: string, 
		mdCtx: MarkdownPostProcessorContext, 
		skCtx: SkContext
	): Promise<SkribiResult> {
		let parsed: {id: string, args: any} = null;
		try { parsed = await parseSkribi(src) }
		catch (e) { renderError(el, e); return Promise.reject('Parsing Error') }

		/* Abort if being rendered in its own definition */
		if (this.plugin.app.metadataCache.getFirstLinkpathDest("", mdCtx.sourcePath)?.basename == parsed.id) {
			renderRegent(el, {class: REGENT_CLS.self, hover: 'Render Aborted: within self definition'}); return Promise.reject('Within Self Definition'); }

		let template = this.eta.getPartial(parsed.id)?.function
		if (!isExtant(template)) {
			if (this.eta.failedTemplates.has(parsed.id)) {el = await renderError(el, {msg: `Template ${parsed.id} exists but failed to compile, with error:` + EBAR + this.eta.failedTemplates.get(parsed.id).error}) }
			else {el = await renderError(el, {msg: `SkribiError: Cannot read undefined template '${parsed.id}' (no such template exists)`})}
			/* We intentionally attempt to render the template even though we know it doesn't exist,
			because it will be caught and converted into a ghost listener. */
		}

		return this.renderSkribi(el, template, parsed.id, mdCtx, Object.assign({}, skCtx, {ctx: parsed.args}));
	}

  /** Wrap non-template skribis in tags as determined by their type flag */
	private async processSkribi(
		el: HTMLElement, 
		src: string, 
		mdCtx: MarkdownPostProcessorContext, 
		skCtx: SkContext
	): Promise<SkribiResult> {
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

  /** Main skribi rendering function */
	private async renderSkribi(
		el: HTMLElement, 
		con: string | TemplateFunctionScoped, 
		id: string, 
		mdCtx: MarkdownPostProcessorContext, 
		skCtx: SkContext
	): Promise<SkribiResult> {
		let handled = false
		let file = this.plugin.app.metadataCache.getFirstLinkpathDest("", mdCtx.sourcePath)

		let newElement = createDiv({cls: "skribi-render-virtual"});
		let child = new SkribiChild(this.plugin, newElement)
		Object.assign(child, {
			/* We assign rerender here for the closure */
			rerender: ((templateToRetrieve?: string) => {
				let nskCtx = Object.assign({}, skCtx, {time: window.performance.now()})
				if (skCtx.flag == 1 && isExtant(templateToRetrieve)) {
					let template = this.eta.getPartial(templateToRetrieve)?.function
					child.unload();
					this.renderSkribi(newElement, template, templateToRetrieve, mdCtx, nskCtx)
				} else {
					child.unload(); 
					this.renderSkribi(newElement, con, id, mdCtx, nskCtx)
				}
			}).bind(this),
			templateKey: (skCtx.flag == 1) ? id : null,
			source: skCtx.source,
			_entryPacket: skCtx.entryPacket
		}) 
			
		let ctx = Object.assign({}, skCtx?.ctx || {}, {child: child.provideContext()})

		let [rendered, packet]: [string, Stringdex] = await this.eta.renderAsync(con, ctx, file)
		.catch((err) => { 
			/* If the template function throws an error, it should bubble up to here. 
			 * This handles almost every type of error that a skribi function can throw, so it's a bit convoluted. */

			if (con === undefined && !this.eta.hasPartial(id)) {
				if (isExtant(this.plugin.handler.loader.initError)) {
					/* Loader failed to init */
					err = this.plugin.handler.loader.initError
				} else {
					/* Template skribi's template does not exist (intentionally not caught until this point) */

					let failed = this.eta.failedTemplates.has(id)
					let msg = `Cannot read template '${id}'`
					msg += failed ? `\nTemplate exists, but failed to compile` : `\nNo such entry found`

					let nerr = new SkribiError(msg)
					if (failed)
					con = skCtx.source

					let stack = msg
					let info = mdCtx.getSectionInfo(mdCtx.el)
					if (info) {
						stack += `\n    at (${(file?.name ? `'/${file.name}'` : null) ?? "source"}) `
						stack += (info.lineStart == info.lineEnd)
								? `line: ${info.lineStart+1}` 
								: `lines: ${info.lineStart+1} to ${info.lineEnd+1}`
					}

					nerr.stack = stack
					Object.assign(nerr, {
						subErr: err, 
						_sk_templateFailure: failed 
							? { id: id, error: this.eta.failedTemplates.get(id).error } 
							: undefined,
						_sk_nullTemplate: failed ? null : id
					})
					err = nerr
				}
			} else if (err?.evalError?.subErr instanceof SkribiImportError) {
				/* Template function invoked a scriptloader module that failed to import */
				/* err.evalError is the thrown ImportError */
				
				// let util = require('util')
			  // console.log(util.inspect(err, 7))

				
				let nerr = new SkribiError(`Could not access scriptloader module from '${err.evalError.subErr._sk_importErrorPacket.file.name}', because it failed to import`)
				nerr.stack = err.evalError.stack
				Object.assign(nerr, {
					_sk_scriptFailure: err?.evalError?.subErr,
					_sk_function: err._sk_function
				})
				err = nerr
			}

			var regentClass = (err instanceof SkribiError) ? err.regentClass : REGENT_CLS.error
			
			if (err?.evalError instanceof SkribiAbortError) {
				regentClass = err.evalError._sk_abortPacket.cls
			}

			// const util = require('util')
			// console.log(util.inspect(err, 7))

			Object.assign(err, {
				_sk_invocation: err?._sk_invocation ?? skCtx.source,
				_sk_template: (skCtx.flag == 1 && this.eta.getPartial(id)?.source) ?? null,
				class: regentClass
			})

			logError(err)
			renderError(el, (err?.hasData) ? err : {
				msg: (err?.msg ?? err) || "Render Error"
			}).then(errEl => {
				/* Alter the child so that it may yet live (and listen for source updates) */
				Object.assign(child, {
					containerEl: errEl,
					state: "error",
					rerender: ((templateToRetrieve?: string) => {
						let nskCtx = Object.assign({}, skCtx, {time: window.performance.now()})
						if (skCtx.flag == 1 && isExtant(templateToRetrieve)) {
							let template = this.eta.getPartial(templateToRetrieve).function
							child.unload();
							this.renderSkribi(errEl, template, templateToRetrieve, mdCtx, nskCtx)
						} else {
							child.unload(); 
							this.renderSkribi(errEl, con, id, mdCtx, nskCtx)
						}
					}).bind(this),
				}) 
				mdCtx.addChild(child)
				this.plugin.children.push(child)
			})

			handled = true;
			return Promise.resolve([null, null])
		})
		/* END ERROR HANDLING */

		/* RENDERING */
		dLog("renderSkribi:", el, mdCtx, skCtx, id)
		if (isExtant(rendered)) {
			let d = isExtant(mdCtx.remainingNestLevel) ? mdCtx.remainingNestLevel : (skCtx.depth)
						
			let style = stripStyleFromString(rendered) // renderMarkdown ignores style nodes so we'll just yoink em 
			if (style[1]) {rendered = style[0]}

			let render = (packet?.['noMarkdown'] 
				? this.simpleRender(rendered, newElement) 
				: MarkdownRenderer.renderMarkdown(rendered, newElement, mdCtx.sourcePath, null))
			.then(() => {
				newElement.setAttribute("skribi", (skCtx.flag == 1) ? 'template' : id)
				if (skCtx.flag == 1) {newElement.setAttribute("skribi-template", id)}
				newElement.removeClass(CLS.virtual)
				if (!newElement.getAttr("class")) {newElement.removeAttribute("class")}

				let shade;
				if (this.plugin.settings.shadowMode) {
					/* it seems that non-codeblock skribis do not survive this process
					 * so the shadowmode setting is hidden for now */
					let nel = createDiv()
					el?.parentElement.prepend(nel)
					nel.setAttr('skribi-host', '')
					console.log(el) 
					shade = nel.attachShadow({mode: 'open'})
					shade.append(newElement)
					el.remove()
				} else {
					el.replaceWith(newElement);
				}

				dLog("finish: ", skCtx.time, window.performance.now());

				if (style[1]) {
					if (this.plugin.settings.shadowMode) {
						(shade as ShadowRoot).append(style[1])
						// newElement.prepend(style[1])
					} else {
						newElement.prepend(style[1]); 
						scopeStyle(child, newElement, style[1]);
					}
				}

				if (skCtx.flag == 1) {
					vLog(`Rendered template "${id}" (${roundTo(window.performance.now()-skCtx.time, 4)} ms)`, newElement)
				} else vLog(`Rendered literal (f: ${skCtx.flag}) (${roundTo(window.performance.now()-skCtx.time, 4)} ms)`, newElement)
				return Promise.resolve(newElement);
			});

			child.setPacket(packet)
			mdCtx.addChild(child)
			// console.log("a", child, this.plugin.children.length)
			this.plugin.children.push(child)
			// console.log("b", child, this.plugin.children.length)

			render.then((e): Promise<any> => {
				// console.log("c", child, this.plugin.children.length)

				child.onPost()
				// console.log("d", child, this.plugin.children.length)

				// TODO: only restrict depth for transclusions
				if (isExtant(mdCtx.remainingNestLevel) && (mdCtx.remainingNestLevel > 0) || !isExtant(mdCtx.remainingNestLevel)) {
					return embedMedia(e, mdCtx.sourcePath, this.plugin, skCtx.depth)
				} else return Promise.resolve()
			})
			.then((x) => {
				dLog("renderer final: ", d)
				this.processEntry({srcType: Modes.general}, newElement, mdCtx, skCtx.depth-1, true) /* Recurse the processor to parse skreeblings */
			})

			return [render, child];
		} else if (!handled) {
			child.clear();
			return Promise.reject("Unknown Render Error");
		}
	}

	/* End of processor chain */

	private async simpleRender(content: string, el: HTMLElement) {
		el.innerHTML = content
		// console.log(el)
		return Promise.resolve()
	}
}