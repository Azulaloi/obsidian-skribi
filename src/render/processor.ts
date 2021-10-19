import { MarkdownPostProcessor, MarkdownPostProcessorContext, MarkdownRenderer } from "obsidian";
import { EtaHandler } from "src/eta/eta";
import { l } from "src/lang/babel";
import SkribosPlugin from "src/main";
import { Modes, Flags, EBAR } from "src/types/const";
import { ProcessorMode, SkContext, Stringdex, TemplateFunctionScoped } from "src/types/types";
import { isExtant, dLog, vLog, roundTo, hash } from "src/util";
import { SkribiChild } from "./child";
import { embedMedia } from "./embed";
import { parseSkribi, preparseSkribi } from "./parse";
import { renderRegent, renderError, renderState } from "./regent";
import { prefixSelectors } from "./styleScope";

type SkribiResult = SkribiResultRendered | SkribiResultQueued | void

type SkribiResultRendered = [Promise<HTMLDivElement>, SkribiChild]
type SkribiResultQueued = {msg: string, qi: number}

export default class SkribiProcessor {
  plugin: SkribosPlugin
  eta: EtaHandler

  constructor(plugin: SkribosPlugin) {
    this.plugin = plugin
    this.eta = plugin.eta
  }

  /**
   * Register our markdown processors. */
  registerProcessors() {
    const processCodeSpan: MarkdownPostProcessor = async(el, ctx) => {this.processEntry({srcType: Modes.general}, el, ctx)}
		this.plugin.registerMarkdownPostProcessor((el, ctx) => processCodeSpan(el, ctx))

    const processCodeBlock = async (mode: ProcessorMode, str: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => { this.processEntry(mode, el, ctx, null, null, str.trimEnd()) }
    ([["normal", "", Flags.none], ["raw", "-raw", Flags.raw], ["literal", "-lit", Flags.literal], ["interpolate", "-int", Flags.interp], ["evaluate", "-eval", Flags.eval]])
		.forEach((v) => {
			this.plugin.registerMarkdownCodeBlockProcessor(`skribi${v[1]}`, processCodeBlock.bind(this, {srcType: Modes.block, flag: v[2]}))
			this.plugin.registerMarkdownCodeBlockProcessor(`sk${v[1]}`, processCodeBlock.bind(this, {srcType: Modes.block, flag: v[2]}))
		})
  }

  /** Entry to the Skribi process chain. Called:
   * - By MarkdownView on each block of a markdown preview
   * - By MarkdownView on code blocks of our register language types
   * - By renderSkribi to recurse nested skribis */
   async processEntry (
		mode: ProcessorMode, // 0: codespan; 1: codeblock;
		doc: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		depth?: number,
		self?: boolean,
		srcIn?: string
	): Promise<Promise<SkribiResult>[] | null> {
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
		var proms: Promise<SkribiResult | void>[] = []
		var temps = 0;
		const elCodes = (mode.srcType == Modes.block) ? [doc] : doc.querySelectorAll("code")
		if (!(d <= 0)) {
			let tm = window.performance.now();
			const elProms = Array.from(elCodes).map(async (el) => {
				let t = window.performance.now();
				dLog("start:", t)
				
				let src = (isExtant(mode.flag) && mode.flag != Flags.none) ?
					{text: srcIn || doc.textContent, flag: mode.flag} : await preparseSkribi(el);

				let originalText = (mode.srcType == Modes.block) ? srcIn : el.textContent

				try {
					if (src != null) {
						let skCtx: SkContext = {time: window.performance.now(), depth: d, flag: src.flag, source: originalText}
						let nel = renderRegent(el, {class: 'sk-loading', hover: l['regent.loading.hover']})
						if (src.flag == 1) {
							proms.push(this.awaitTemplatesLoaded({el: nel, src: src.text, mdCtx: ctx, skCtx: skCtx})
							.catch(e => {console.warn(`Skribi: Dispatch Errored`, EBAR, e)}));
							temps++;
						} else {
							proms.push(this.processSkribi(nel, src.text, ctx, skCtx)
							.catch(e => {console.warn(`Skribi: Dispatch Errored`, EBAR, e)}))
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
							if (this.plugin.initLoaded) {
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
			if (proms.length > 0) console.log(ctx.el, proms)
			return proms
		} else {
			/* Depth too high! */

			elCodes.forEach(async (el) => {
				preparseSkribi(el).then(async (src) => {
					if (src != null) renderState(el, {hover: l['regent.stasis.hover'], class: 'stasis'})
				})
			})
			dLog("processor hit limit"); 
			
			return Promise.resolve(null); // Postprocessor calls are not caught so we can't reject neatly
		}
	}

  private queuedTemplates: Array<Function> = [] // TODO: maybe construct promises to resolve on event so the promise chain isn't broken?

  /* Ensures that the initial template load is complete before continuing to render. */
	async awaitTemplatesLoaded(args: {el: HTMLElement, src: any, mdCtx: MarkdownPostProcessorContext, skCtx: SkContext}): Promise<SkribiResult> {
		let el = renderRegent(args.el, {class: 'wait', label: 'sk', hover: 'Awaiting Template Cache', clear: true})
		// let el = args.el

		if (!this.plugin.initLoaded) {
			dLog("not yet loaded")
      let func = async () => {return await this.processSkribiTemplate(el, args.src, args.mdCtx, Object.assign(args.skCtx, {time: window.performance.now()}))}
      let q = this.queuedTemplates.push(func)

      return Promise.resolve({msg: "Queued", qi: q})
		} else return await this.processSkribiTemplate(el, args.src, args.mdCtx, args.skCtx)
	}

  /* Called by template load event. */
  templatesReady() {
    let proms = this.queuedTemplates.map((func) => func())
    Promise.allSettled(proms).then(() => {this.queuedTemplates = []})
  }

	async processSkribiTemplate(
		el: HTMLElement, 
		src: string, 
		mdCtx: MarkdownPostProcessorContext, 
		skCtx: SkContext
	): Promise<SkribiResult> {
		let parsed: {id: string, args: any} = null;
		try { parsed = await parseSkribi(src) }
		catch (e) { renderError(el, e); return Promise.reject('Parsing Error') }
		
		// Abort if being rendered in its own definition
		if (this.plugin.app.metadataCache.getFirstLinkpathDest("", mdCtx.sourcePath).basename == parsed.id) {
			renderRegent(el, {class: 'self', hover: l['regent.stasis.hover']}); return Promise.reject('Within Self Definition'); }

		let template = this.eta.getPartial(parsed.id)?.function
		if (!isExtant(template)) {
			if (this.eta.failedTemplates.has(parsed.id)) {el = await renderError(el, {msg: `Template ${parsed.id} failed to compile, error: \n` + this.eta.failedTemplates.get(parsed.id)}) }
			else {el = await renderError(el, {msg: `No such template '${parsed.id}'`})}
			// return Promise.reject(`Missing Template Definition '${parsed.id}'`)
		}

		return this.renderSkribi(el, template, parsed.id, mdCtx, Object.assign({}, skCtx, {ctx: parsed.args}));
	}

  /** Wrap non-template skribis in tags as determined by their type flag */
	async processSkribi(
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
	async renderSkribi(
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
		/* Bind child properties */
		Object.assign(child, {
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
			source: skCtx.source
		}) 
			
		let ctx = Object.assign({}, skCtx?.ctx || {}, {child: child.provideContext()})

		let [rendered, packet]: [string, Stringdex] = await this.eta.renderAsync(con, ctx, file)
		.catch((err) => { /* If the template function throws an error, it should bubble up to here. */

			/* If a template skribi's template vanishes */
			if (con === undefined && !this.eta.hasPartial(id)) {
				con = skCtx.source
				err = `SkribiError: Cannot read undefined template '${id}'\n`
				let info = mdCtx.getSectionInfo(mdCtx.el)
				if (info) err += `   at (MarkdownSectionInfo) lineStart: ${info.lineStart}, lineEnd: ${info.lineEnd} (zero-indexed)`
			}

			if (this.plugin.settings.errorLogging) {console.warn(`Skribi render threw error! Displaying content and error...`, EBAR, con, EBAR, err)}
			renderError(el, (err?.hasData) ? err : {msg: err?.msg || err || "Render Error"}).then(errEl => {
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
				/* this bit disabled because it kills other skribis rendering in the same block */
				// if (el?.parentElement?.nodeName == "P") { // true when (mode == Mode.block)
					// el.parentElement.replaceWith(el) // strip the superfluous P element
				// }
				newElement.setAttribute("skribi", (skCtx.flag == 1) ? 'template' : id)
				if (skCtx.flag == 1) {newElement.setAttribute("skribi-template", id)}
				newElement.removeClass("skribi-render-virtual")
				if (!newElement.getAttr("class")) {newElement.removeAttribute("class")}

				let shade;
				if (this.plugin.settings.shadowMode) {
					/* it seems that non-codeblock skribis do not survive this process */
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
			this.plugin.children.push(child)
			
			render.then((e): Promise<any> => {
				child.onPost()

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

	async simpleRender(content: string, el: HTMLElement) {
		el.innerHTML = content
		console.log(el)
		return Promise.resolve()
	}
}

/* STYLE FUNCTIONS */

export function stripStyleFromString(str: string): [string, HTMLStyleElement | null] {
	let x = createDiv()
	x.innerHTML = str
	// console.log('prestrip', x)
	let style = x.querySelector('style')
	if (style) x.removeChild(style)

	return [x.innerHTML, style ?? null]
}

/* s must be attached to document or s.sheet will be null */
export function scopeStyle(child: SkribiChild, el: HTMLElement, s: HTMLStyleElement): HTMLStyleElement {
	child.hash = child.hash ?? hash(child.source)
	child.containerEl.setAttr('sk-hash', child.hash)
	if (!s.sheet) {
		console.warn("Skribi: Could not scope style because it was not attached to the document!", EBAR, "Style: ", s, EBAR, "In element: ", el, EBAR, "Of child:", child); 
		return
	}
	const l = s.sheet.cssRules.length
	for (let i = 0; i < l; ++i) {
		const rule = s.sheet.cssRules[i]

		if (!(rule instanceof CSSImportRule)) {
			scopeRule(rule, ['sk-hash', child.hash])
		}
	}

	/* Changing the rule properties doesn't change the text of the style element, so we do it manually so make the resolved behavior visible for users in element panel */
	if ((window.app.plugins.plugins['obsidian-skribi'] as SkribosPlugin).settings.reflectStyleTagText) {
		let rules = []
		for (let i = 0; i < s.sheet.cssRules.length; i++) {
			rules.push(s.sheet.cssRules.item(i))
		}
		let str = rules.reduce<string>((a: string, b: CSSRule) => {return a + `${b.cssText}` + '\n'}, "")
		s.textContent = str
	}

	return s
}

/** Mutates a CSSRule's selectors to select elements with attribute 'sk-hash' equal to hash 
/* @param rule CSSRule to scope 
/* @param hash [attrKey, attrVal] to target */
function scopeRule(rule: CSSRule, target: [string, number]): void {
	if (!(rule instanceof CSSStyleRule)) return; // media and import rules ignored

	let b = prefixSelectors(rule.selectorText, `[${target[0]}='${target[1]}']`)
	rule.selectorText = b
}