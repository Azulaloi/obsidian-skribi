import * as Eta from "eta";
import { TemplateFunction } from "eta/dist/types/compile";
import { EtaConfig, PartialConfig } from "eta/dist/types/config";
import { CallbackFn } from "eta/dist/types/file-handlers";
import { debounce, FrontMatterCache, MarkdownRenderer, TAbstractFile, TFile } from "obsidian";
import SkribosPlugin from "../main";
import { DynamicState, scopedVars, Stringdex, TemplateFunctionScoped } from "../types/types";
import { checkFileExt, getFiles, isExtant, isFile, promiseImpl, vLog, withoutKey } from "../util";
import { Cacher } from "./cacher";
import { ProviderBus } from "./provider_bus";

export class EtaHandler {
  plugin: SkribosPlugin;
  bus: ProviderBus;
  varName: string;

  templates: Cacher<TemplateFunctionScoped> = new Cacher<TemplateFunctionScoped>({})
  failedTemplates: Map<string, string> = new Map();
  templateFrontmatters: Map<string, FrontMatterCache> = new Map();
  templatesDirty: boolean = false;

  baseContext: {[index: string]: any} = { 
    // provide_stat: this.provide_stat()
  }

  constructor(plugin: SkribosPlugin) {
    this.plugin = plugin;
    this.bus = new ProviderBus(this)
    this.varName = plugin.varName;

    if (!this.plugin.app.workspace.layoutReady) {
      this.plugin.app.workspace.onLayoutReady(async () => this.initLoad())
    } else {this.initLoad()}



		let bUpdate = debounce(this.definePartials.bind(this), 500, true)
    plugin.registerEvent(plugin.app.vault.on('modify', e => {
			if (this.isInScripts(e)) this.bus.scriptLoader.fileUpdated(e);
			if (this.isInTemplates(e)) bUpdate(e);
		}))

		plugin.registerEvent(plugin.app.vault.on('delete', e => {
			if (this.isInScripts(e)) this.bus.scriptLoader.fileDeleted(e);
			if (this.isInTemplates(e)) this.deleteTemplate(e as TFile)
		}))

		plugin.registerEvent(plugin.app.vault.on('create', e => {
			if (this.isInScripts(e)) this.bus.scriptLoader.fileAdded(e);
			if (this.isInTemplates(e)) bUpdate(e);
		}))
  }

  isInTemplates = (e: TAbstractFile) => this.isInFolder(e, this.plugin.settings.templateFolder)
	isInScripts = (e: TAbstractFile) => this.isInFolder(e, this.plugin.settings.scriptFolder)
	isInFolder = (e: TAbstractFile, path: string) => (isFile(e) && e.path.contains(path))

  async initLoad() {
    let a = this.bus.init()
    let b = this.initPartials()

    return Promise.allSettled([a, b])
  }

  unload() {
    this.bus.unload()
  }

  // Testing closures in skript context
  provide_stat(): Function {
    return () => {
      return this.varName
    }
  }

  async initPartials() {
    this.definePartials(...getFiles(this.plugin.app, this.plugin.settings.templateFolder))
  }

  /* Load and compile files into the template cache */
  async definePartials(...files: TFile[]) {
    let t = (files.length == 0) ? window.performance.now() : 0  
    let x = 0
    let x2 = 0

    var busScope = this.bus.getScope(null, true)

    const reads = files.map(async f => {
      if (!checkFileExt(f, ["md", "eta", "txt"])) return Promise.resolve();

      let read = await this.plugin.app.vault.cachedRead(f);
      
      let ff = this.plugin.app.metadataCache.getFileCache(f)?.frontmatter
      
      if (ff) {
        let n = (/(?<frontmatter>^---.*?(?=\n---)\n---)/s).exec(read);
        let nf = isExtant(n?.groups?.frontmatter) ? n.groups.frontmatter : null
        if (nf) { read = read.substr(nf?.length || 0); } //console.log(parseFrontMatterStringArray(ff, "prompt"));
      }

      let compiled;
      try {
        let str = Eta.compileToString(read, Eta.getConfig({varName: this.varName, async: false, name: f.basename}))
        compiled = compileWithScope(str, {
          'sk': null,
          'E': null,
          'cb': null,
          ...busScope})
      } catch(e) {
        this.failedTemplates.set(f.basename, e || "Template failed to compile.")
        console.warn(`Skribi: template "${f.basename}" failed to compile \n`, e, read)
        this.templates.remove(f.basename)
        this.templateFrontmatters.delete(f.basename)
        x++;
      }

      if (isExtant(compiled)) {
        this.failedTemplates.delete(f.basename)
        this.templates.define(f.basename, await compiled)
        if (ff) this.templateFrontmatters.set(f.basename, withoutKey(ff, "position") as FrontMatterCache)
        x2++;
      }

      return Promise.resolve();
    })


    await Promise.allSettled(reads)

    if (!this.plugin.initLoaded ) {
      let loaded = true;

      if (loaded) {
        if (files.length > 0) {
          let str = `${x2} template${(x2 == 1) ? "" : "s"}` //+ `in: ${roundTo(window.performance.now()-t, 4)}ms`
          if (x) str += `\n Of ${files.length} total templates, ${x} failed to compile.`
          console.log("Skribi: Loaded " + str)
        } 
        this.plugin.loadEvents.trigger('init-load-complete')
      } else {
        console.warn("Skribi had trouble loading...")
      }
    } else {
      this.setDirty(false);
      vLog(`Updated template "${files[0].basename}" in ${window.performance.now()-t}ms`)
    }

    return Promise.resolve()
  }

  deleteTemplate(...files: TFile[]) {
    /* do deletion */
  }

  setDirty(dirty: boolean) {
    if (dirty) this.bus.createStaticScope()
    this.templatesDirty = dirty
  }

  getPartial(id: string) {
    return this.templates.get(id)
  }

  hasPartial(id: string) {
    return isExtant(this.templates.get(id))
  }

  getCache(): Cacher<TemplateFunctionScoped> {
    return this.templates
  }

  getCacheStore(): Record<string, TemplateFunctionScoped> {
    //@ts-ignore
    return this.templates.cache as Record<string, TemplateFunctionScoped>
  }

  getCacheKeys(): string[] {
    return Object.keys(this.getCacheStore())
  }

  /**   
  * Primary skribi render function. Renders asynchronously (template function syncronicity determined by )
  * @param content String or scoped template function to render
  * @param ctxIn Context object to be added to `sk` object
  * @param file File in which the skribi is being rendered  
  * @returns [rendered string, returned packet (currently unused)] */
  async renderAsync(content: string | TemplateFunctionScoped, ctxIn?: any, file?: TFile): Promise<[string, Stringdex]> {
    if (!isFile(file)) return Promise.reject(`Could not identify current file: ${file.path}`);

    let z: Stringdex = {};
    function p() {
      return function(x: string, y: any) {
        z[x] = y
      }
    }

    let cfg = Eta.getConfig({varName: "sk", useWith: false, async: false})

    /* the 'this' object of the sk context*/
    let binder = {
      file: file,
      plugin: this.plugin,
      app: this.plugin.app
    }

    /* The 'sk' object */
    let sk = Object.assign({},
      this.baseContext,
      ctxIn || {}, 
      {up: p(), this: binder},
      this.bus.getScopeSK()
    )

    /* scope of the tfunc env */
    let scope: scopedVars = {
      'sk': sk,
      'E': cfg,
      'cb': null,
      ...this.bus.getScope(),
    }

    let ren = (content.toString().contains('await')) // This will catch strings containing await as well, maybe a flag should be used instead
    ? renderEtaAsync(this, content, {}, cfg, null, scope, binder)
    : renderEta(this, content, {}, cfg, null, scope, binder)

    // console.log("psuedo post:", sk)
    if (ren instanceof Promise) {
      return await ren.then((r) => {return Promise.resolve([r, z])}, (r) => {return Promise.reject(r)})
    } else if (String.isString(ren)) { return Promise.resolve([ren as string, z]) }
    else return Promise.reject("EtaHandler.renderAsync: Unknown Error")
  }

  /* this is somehow 1.3x slower than renderAsync */
  async renderAsyncNaive(content: string | Function, ctxIn?: any, varName?: any) {
    console.log('Skribos: renderAsyncNaive invoked', content, ctxIn)
    let context = Object.assign({}, this.baseContext, ctxIn || {})
    let ren = Eta.renderAsync(content as (string | TemplateFunction), context, {varName: varName ?? this.varName})

    if (ren instanceof Promise) {
      return await ren.then((r) => {return Promise.resolve(r)}, (r) => {return Promise.reject(r)})
    } else if (String.isString(ren)) { return Promise.resolve(ren as string) }
    else return Promise.reject("Unknown error")
  }

  render(content: string, ctxIn?: any) {
    let context = ctxIn || {};

    content = Eta.render(content, context, { 
      varName: this.varName
    }) as string;

    return content;
  }

  /** TemplateFunction handler, will return cached or compiled function, appropriately bound and scoped
   * @param template String or scoped template function
   * @param options EtaConfig 
   * @param scope Object containing objects that should be available in the returned function's scope 
   * @param binder Object to which the returned function will be bound
   */
  getCached(template: string | TemplateFunctionScoped, options: EtaConfig, scope?: Stringdex, binder?: any): TemplateFunctionScoped {
    if (options.name && this.templates.get(options.name)) {
      return (binder) ? this.templates.get(options.name).bind(binder) : this.templates.get(options.name)
    }
  
    const templateFunc = typeof template === 'function' ? template : compileWithScope(Eta.compileToString(template, options), scope || {}, options.async)
  
    if (options.name) this.templates.define(options.name, templateFunc);
  
    return (binder) ? templateFunc.bind(binder) : templateFunc
  }
}

/* Version of Eta's render function, modified to handle scoped templates */
function renderEta(
  handler: EtaHandler,
  template: string | TemplateFunctionScoped,
  data: object,
  config?: PartialConfig,
  cb?: CallbackFn,
  scope?: scopedVars,
  binder?: any
  ): string | Promise<string> | void {
  const options = Eta.getConfig(config || {})

  if (options.async) {
    // if (cb) {
      // try { 
        // const templateFn = handler.getCached(template, options, scope, binder)
        // templateFn(scope)
      // } catch(e) {
        // return cb(e)
      // }
    // } else {
      return new promiseImpl(function (resolve: Function, reject: Function) {
        try {
          resolve(handler.getCached(template, options, scope, binder)(scope))
        } catch (e) {
          reject(e)
        }
      })
    // }
  } else {
    return handler.getCached(template, options, scope, binder)(scope)
  }
}

/* Version of Eta's async render function, just sets async to true */
/* Note: perf impact of using async templatefunctions is negligible */
function renderEtaAsync(
  handler: EtaHandler,
  template: string | TemplateFunctionScoped,
  data: object,
  config?: PartialConfig,
  cb?: CallbackFn,
  scope?: scopedVars,
  binder?: any
  ): string | Promise<string> | void {
    console.log()
    return renderEta(handler, template, data, Object.assign({}, config, {async: true}), cb, scope, binder)
}

function getAsyncConstructor(): Function {
  return new Function('return (async function(){}).constructor')()
}

/** Adds the entries of scope to a function string. 
* @param functionString A string function compiled by Eta's compileToString() 
* @param scope Object containing entries to be added to function scope 
* @param async If true, returned function will be asynchronous */
function compileWithScope(functionString: string, scope: Stringdex, async?: boolean): TemplateFunctionScoped {
  var a = ""; var b = "";
  for (var v in scope) {
    a += `${v},`;
    b += `'${v}',`
  }

  let func = `var {${a.substr(0, a.length-1)}} = scope;\n` + functionString

  let constructor = (async) ? (getAsyncConstructor() as FunctionConstructor) : Function 

  // let compiled = new Function('scope', func)
  let compiled = new constructor('scope', func)

  return compiled as TemplateFunctionScoped
}