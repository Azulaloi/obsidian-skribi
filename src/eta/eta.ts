import * as Eta from "eta";
import { EtaConfig, PartialConfig } from "eta/dist/types/config";
import { CallbackFn } from "eta/dist/types/file-handlers";
import { FrontMatterCache, MarkdownRenderer, TFile } from "obsidian";
import SkribosPlugin from "../main";
import { scopedVars, Stringdex, TemplateFunctionScoped } from "../types";
import { checkFileExt, getFiles, isExtant, isFile, promiseImpl, vLog, withoutKey } from "../util";
import { Cacher } from "./cacher";
import { ProviderBus } from "./provider_bus";

const obsidianModule = require("obsidian");

export class EtaHandler {
  plugin: SkribosPlugin;
  bus: ProviderBus;
  varName: string;

  templates: Cacher<TemplateFunctionScoped> = new Cacher<TemplateFunctionScoped>({})
  failedTemplates: Map<string, string> = new Map();
  templateFrontmatters: Map<string, FrontMatterCache> = new Map();
  templatesDirty: boolean = false;

  baseContext: {[index: string]: any} = { 
    // obsidian: obsidianModule,
    render: function(str: string) {
      let e = createDiv({cls: "skribi-render-virtual"});
      console.log(this)
      MarkdownRenderer.renderMarkdown(str, e, this.this.file.path, null);
      return e.innerHTML
    },
    has: function(v: string) {
      return !((this.v?.[v] == null) || (this.v?.[v] == undefined))
    },
    provide_stat: this.provide_stat()
  }

  constructor(plugin: SkribosPlugin) {
    this.plugin = plugin;
    this.bus = new ProviderBus(this)
    this.varName = plugin.varName;

    if (!this.plugin.app.workspace.layoutReady) {
      this.plugin.app.workspace.onLayoutReady((async () => {this.bus.init()}).bind(this.bus))
      this.plugin.app.workspace.onLayoutReady(async () => this.initPartials())  
    } else {this.initPartials(); this.bus.init();}
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

  async definePartials(...files: TFile[]) {
    let t = (files.length == 0) ? window.performance.now() : 0  
    let x = 0
    let x2 = 0

    var busScope = this.bus.getScope(true)

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
        // compiled = Eta.compile(read, {varName: this.varName})
      } catch(e) {
        this.failedTemplates.set(f.basename, e || "Template failed to compile.")
        console.warn(`Skribi: template "${f.basename}" failed to compile \n`, e, read)
        this.templates.remove(f.basename)
        // Eta.templates.remove(f.basename)
        this.templateFrontmatters.delete(f.basename)
        x++;
      }

      if (isExtant(compiled)) {
        this.failedTemplates.delete(f.basename)
        this.templates.define(f.basename, await compiled)
        // Eta.templates.define(f.basename, compiled)
        if (ff) this.templateFrontmatters.set(f.basename, withoutKey(ff, "position") as FrontMatterCache)
        x2++;
      }

      return Promise.resolve();
    })

    if (!this.plugin.initLoaded ) {
      Promise.allSettled(reads).then(() => {
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
      })
    } else {
      this.setDirty(false);
      vLog(`Updated template "${files[0].basename}" in ${window.performance.now()-t}ms`)
    }
  }

  setDirty(dirty: boolean) {
    if (dirty) this.bus.createScope()
    this.templatesDirty = dirty
  }

  getPartial(id: string) {
    // return Eta.templates.get(id)
    return this.templates.get(id)
  }

  hasPartial(id: string) {
    // return isExtant(Eta.templates.get(id))
    return isExtant(this.templates.get(id))
  }

  getCache(): Cacher<TemplateFunctionScoped> {
    // return Eta.templates
    return this.templates
  }

  getCacheStore(): Record<string, TemplateFunctionScoped> {
    //@ts-ignore
    // return Eta.templates.cache as Record<string, TemplateFunction>
    return this.templates.cache as Record<string, TemplateFunctionScoped>
  }

  getCacheKeys(): string[] {
    return Object.keys(this.getCacheStore())
  }

  async renderAsync(content: string | TemplateFunctionScoped, ctxIn?: any, file?: TFile, packet?: any): Promise<[string, Stringdex]> {
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
      plugin: this.plugin
    }

    /* The 'sk' object */
    let sk = Object.assign({},
      this.baseContext,
      ctxIn || {}, 
      {up: p(), this: binder},
    )

    /* scope of the tfunc env */
    let scope: scopedVars = {
      'sk': sk,
      'E': cfg,
      'cb': null,
      ...this.bus.getScope()
    }

    let ren = renderEtaAsync(this, content, {}, cfg, null, scope, binder)

    // console.log("psuedo post:", sk)
    if (ren instanceof Promise) {
      return await ren.then((r) => {return Promise.resolve([r, z])}, (r) => {return Promise.reject(r)})
    } else if (String.isString(ren)) { return Promise.resolve([ren as string, z]) }
    else return Promise.reject("Unknown error")
  }

  async renderAsyncNaive(content: string, ctxIn?: any, varName?: any) {
    let context = Object.assign({}, this.baseContext, ctxIn || {})
    let ren = Eta.renderAsync(content, context, {varName: varName ?? this.varName})

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

  getCached(template: string | TemplateFunctionScoped, options: EtaConfig, scope?: Stringdex, binder?: any): TemplateFunctionScoped {
    if (options.name && this.templates.get(options.name)) {
      return (binder) ? this.templates.get(options.name).bind(binder) : this.templates.get(options.name)
    }
  
    const templateFunc = typeof template === 'function' ? template : compileWithScope(Eta.compileToString(template, options), scope || {})
  
    if (options.name) this.templates.define(options.name, templateFunc);
  
    return (binder) ? templateFunc.bind(binder) : templateFunc
  }
}

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
    if (cb) {
      try {
        const templateFn = handler.getCached(template, options, scope, binder)
        templateFn(scope)
      } catch(e) {
        return cb(e)
      }
    } else {
      return new promiseImpl(function (resolve: Function, reject: Function) {
        try {
          resolve(handler.getCached(template, options, scope, binder)(scope))
        } catch (e) {
          reject(e)
        }
      })
    }
  } else {
    return handler.getCached(template, options, scope, binder)(scope)
  }
}

function renderEtaAsync(
  handler: EtaHandler,
  template: string | TemplateFunctionScoped,
  data: object,
  config?: PartialConfig,
  cb?: CallbackFn,
  scope?: scopedVars,
  binder?: any
  ): string | Promise<string> | void {
    return renderEta(handler, template, data, Object.assign({}, config, {async: false}), cb, scope, binder)
}

function compileWithScope(f: string, scope: Stringdex): TemplateFunctionScoped {
  var a = ""; var b = "";
  for (var v in scope) {
    a += `${v},`;
    b += `'${v}',`
  }

  let func = `var {${a.substr(0, a.length-1)}} = scope;\n` + f

  // console.log(func)
  // let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
  // let c = new AsyncFunction('scope', func)

  // let c = new Function('sk', 'E', 'cb', 'scope', func)

  let c = new Function('scope', func)

  return c as TemplateFunctionScoped
}