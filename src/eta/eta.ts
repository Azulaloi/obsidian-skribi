import * as Eta from "eta";
import { TemplateFunction } from "eta/dist/types/compile";
import { EtaConfig } from "eta/dist/types/config";
import { normalizePath, TAbstractFile, TFile } from "obsidian";
import { normalize } from "path";
import { EBAR, VAR_NAME } from "src/types/const";
import SkribosPlugin from "../main";
import { scopedVars, Stringdex, TemplateFunctionScoped } from "../types/types";
import { isExtant, isFile, isInFolder } from "../util";
import { renderEtaAsync, renderEta, compileWith } from "./comp";
import { ProviderBus } from "./provider_bus";
import { TemplateLoader } from "./templates";

export class EtaHandler {
  plugin: SkribosPlugin;
  bus: ProviderBus;
  loader: TemplateLoader;

  templatesDirty: boolean = false;

  baseContext: {[index: string]: any} = {}

  get templates() {return this.loader.templateCache}
  get failedTemplates() {return this.loader.templateFailures}
  get templateFrontmatters() {return this.loader.templateFrontmatters}

  constructor(plugin: SkribosPlugin) {
    this.plugin = plugin;
    this.bus = new ProviderBus(this)
    this.loader = new TemplateLoader(this)

    if (!this.plugin.app.workspace.layoutReady)
      this.plugin.app.workspace.onLayoutReady(() => this.init.bind(this)())
    else this.init()
  }

  init() {
    this.initLoad().then(() => {
      this.plugin.registerEvent(this.plugin.app.vault.on('modify', e => {
        if (this.isInScripts(e)) this.bus.scriptLoader.fileUpdated(e)
        if (this.isInTemplates(e)) this.loader.fileUpdated(e)
      }))
  
      this.plugin.registerEvent(this.plugin.app.vault.on('delete', e => {
        // console.log(e)
        if (this.isInScripts(e)) this.bus.scriptLoader.fileDeleted(e)
        if (this.isInTemplates(e)) this.loader.fileDeleted(e)
      }))
  
      this.plugin.registerEvent(this.plugin.app.vault.on('create', e => {
        if (this.isInScripts(e)) this.bus.scriptLoader.fileAdded(e)
        if (this.isInTemplates(e)) this.loader.fileAdded(e)
      }))

      this.plugin.registerEvent(this.plugin.app.vault.on('rename', (file, oldPath) => {
        for (let obj of [this.bus.scriptLoader, this.loader]) {
          let ourDir = this.plugin.app.vault.getAbstractFileByPath(normalizePath(obj.directory))
          let oldDir = this.plugin.app.vault.getAbstractFileByPath(normalizePath((/.+\//g).exec(oldPath)[0]))
          // console.log(oldDir, ourDir)
          if (file.parent == ourDir) {
            // New location of file is in our directory
            if (file.parent == oldDir) {
              // File did not move but was renamed
              obj.fileRenamed(file, (/([a-zA-Z0-9-_.]+\..*)/g).exec(oldPath)[0])
            } else {
              // File was moved from elsewhere into the template directory
              obj.fileAdded(file)
            }
          } else if (oldDir == ourDir) {
            // File used to be in templates directory and is no longer
            obj.fileDeleted(file)
          }
        }
      }))
    }).catch((err) => {
      console.error(`Skribi: EtaHandler failed to initialize!`, EBAR, err)
    })
  }

  isInTemplates = (e: TAbstractFile) => isInFolder(e, this.plugin.settings.templateFolder)
	isInScripts = (e: TAbstractFile) => isInFolder(e, this.plugin.settings.scriptFolder)

  async initLoad() {
    let {a: a, b: b} = await this.bus.preInit().then(() => {
      return {a: this.bus.init(), b: this.loader.init()}
    })

    return Promise.all([a, b])
  }

  unload() {
    this.bus.unload()
  }

  recompileTemplates() {
    // If the bus scope changes, the templates must be recompiled. 
    // The bus scope should not change post-init unless an external source modifies the provider list.
    this.loader.reload()
  }

  getPartial(id: string) {
    return this.loader.templateCache.get(id)
  }

  hasPartial(id: string) {
    return isExtant(this.loader.templateCache.get(id))
  }

  getCacheKeys(): string[] {
    //@ts-ignore
    return Object.keys(this.templates.cache)
  }

  /**   
  * Primary skribi render function. Renders asynchronously (TemplateFunction may or may not be async)
  * @param content String or scoped template function to render
  * @param ctxIn Context object to be added to `sk` object
  * @param file File in which the skribi is being rendered  
  * @returns [rendered string, returned packet (currently unused)] */
  async renderAsync(content: string | TemplateFunctionScoped, ctxIn?: any, file?: TFile): Promise<[string, Stringdex]> {
    // if (!isFile(file)) return Promise.reject(`Could not identify current file: ${file}`);

    let z: Stringdex = {};
    function p() {
      return function(x: string, y: any) {
        z[x] = y
      }
    }

    let cfg = Eta.getConfig({varName: VAR_NAME})

    /* the 'this' object of the sk context*/
    let binder = {
      file: file || null,
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
    let ren = Eta.renderAsync(content as (string | TemplateFunction), context, {varName: varName ?? VAR_NAME})

    if (ren instanceof Promise) {
      return await ren.then((r) => {return Promise.resolve(r)}, (r) => {return Promise.reject(r)})
    } else if (String.isString(ren)) { return Promise.resolve(ren as string) }
    else return Promise.reject("Unknown error")
  }

  render(content: string, ctxIn?: any) {
    let context = ctxIn || {};

    content = Eta.render(content, context, { 
      varName: VAR_NAME
    }) as string;

    return content;
  }

  /** TemplateFunction handler, will return cached or compiled function, appropriately bound and scoped
   * @param template String or scoped template function
   * @param options EtaConfig 
   * @param scope Object containing objects that should be available in the returned function's scope 
   * @param binder Object to which the returned function will be bound */
  getCached(template: string | TemplateFunctionScoped, options: EtaConfig, scope?: Stringdex, binder?: any): TemplateFunctionScoped {
    if (options.name && this.templates.get(options.name)) {
      return (binder) ? this.templates.get(options.name).bind(binder) : this.templates.get(options.name)
    }
  
    const templateFunc = typeof template === 'function' ? template : compileWith(Eta.compileToString(template, options), Object.keys(scope), options.async)
  
    if (options.name) this.templates.define(options.name, templateFunc);
  
    return (binder) ? templateFunc.bind(binder) : templateFunc
  }
}

