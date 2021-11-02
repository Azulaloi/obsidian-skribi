import * as Eta from "eta";
import { TemplateFunction } from "eta/dist/types/compile";
import { EtaConfig } from "eta/dist/types/config";
import { normalizePath, TFile } from "obsidian";
import { EBAR, VAR_NAME } from "src/types/const";
import SkribosPlugin from "../main";
import { FileMinder, scopedVars, Stringdex, TemplateFunctionScoped } from "../types/types";
import { isExtant } from "../util/util";
import { compileWith } from "./comp";
import { SkribiError, SkribiEtaSyntaxError, SkribiSyntaxError } from "./error";
import { renderEta } from "./eval";
import compileToString from "./mod";
import { ProviderBus } from "./provider_bus";
import { TemplateLoader } from "./templates";

export class EtaHandler {
  plugin: SkribosPlugin;
  bus: ProviderBus;
  loader: TemplateLoader;

  templatesDirty: boolean = false;

  get templates() {return this.loader.templateCache}
  get failedTemplates() {return this.loader.templateFailures}
  // get templateFrontmatters() {return this.loader.templateFrontmatters}

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
      this.registerFileEvents()
    }).catch((err) => {
      console.error(`Skribi: EtaHandler failed to initialize!`, EBAR, err)
    })
  }

  registerFileEvents() {
    /* Because the FileMinder index does not change, we don't need the event refs */

    const minders: FileMinder[] = [this.bus.scriptLoader, this.loader]
    for (let minder of minders) {
      this.plugin.registerEvent(this.plugin.app.vault.on('modify', file => {
        if (minder.isInDomain(file)) minder.fileUpdated(file)
      }))

      this.plugin.registerEvent(this.plugin.app.vault.on('delete', file => {
        if (minder.isInDomain(file)) minder.fileDeleted(file)
      }))

      this.plugin.registerEvent(this.plugin.app.vault.on('create', file => {
        if (minder.isInDomain(file)) minder.fileAdded(file)
      }))

      this.plugin.registerEvent(this.plugin.app.vault.on('rename', (file, oldPath) => {
          let ourDir = this.plugin.app.vault.getAbstractFileByPath(normalizePath(minder.directory))
          let oldDir = this.plugin.app.vault.getAbstractFileByPath(normalizePath((/.+\//g).exec(oldPath)[0]))
          if (file.parent == ourDir) {
            // New location of file is in our directory
            if (file.parent == oldDir) {
              // File did not move but was renamed
              minder.fileRenamed(file, (/([a-zA-Z0-9-_.]+\..*)/g).exec(oldPath)[0])
            } else {
              // File was moved from elsewhere into the template directory
              minder.fileAdded(file)
            }
          } else if (oldDir == ourDir) {
            // File used to be in templates directory and is no longer
            minder.fileDeleted(file)
          }
      }))
    }
  }

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
    return this.loader.reload()
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
    /* Used to pass data up to the render process from the skribi function */
    let packet: Stringdex = {};
    function up() {
      return function(x: string, y: any) {
        packet[x] = y
      }
    }

    let cfg = Eta.getConfig({
      varName: VAR_NAME, 
      async: content.toString().contains('await') // This will catch strings containing await as well
    })

    /* the 'this' object of the sk context*/
    let binder = {}

    /* The 'sk' object */
    let sk = Object.assign({},
      ctxIn || {}, 
      {
        this: binder, 
        getEnv: getEnv, 
        up: up(), 
        ctx: {
          file: file || null,
          plugin: this.plugin,
          app: this.plugin.app
        }
      },
      this.bus.getScopeSK()
    )

    /*
    Object.defineProperty(sk.ctx, 'file', {get: function() {
      if (file) return file
      else throw new SkribiError("file (sk.ctx.file) does not exist in current render context")
    }})
    */

    /* Scope to pass to the function. Must contain all keys that function was compiled with. */
    let scope: scopedVars = {
      'sk': sk,
      'E': cfg,
      'cb': () => {},
      ...this.bus.getScope({child: ctxIn?.child._c}),
    }

    function getEnv() {
      return scope
    }

    let ren = renderEta(this, content, {}, cfg, null, scope, binder);
    
    if (ren instanceof Promise) {
      console.log(ren)
      return await ren.then((r) => {return Promise.resolve([r, packet])}, (r) => {return Promise.reject(r)})
    } else if (String.isString(ren)) {
      return Promise.resolve([ren as string, packet]) 
    } else return Promise.reject("EtaHandler.renderAsync: Unknown Error")
  }

  /* this is somehow 1.3x slower than renderAsync */
  async renderAsyncNaive(content: string | Function, ctxIn?: any, varName?: any) {
    console.log('Skribos: renderAsyncNaive invoked', content, ctxIn)
    let context = Object.assign({}, ctxIn || {})
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
  getCached(template: string | TemplateFunctionScoped, options: EtaConfig, scope?: Stringdex, binder?: any): templateGet {
    if (options.name && this.templates.get(options.name)) {
      return (binder) ? this.templates.get(options.name).function.bind(binder) : this.templates.get(options.name)
    }

    var templateFunc;
    try {
      templateFunc = (typeof template === 'function') 
        ? template 
        : compileWith(compileToString(template, options), Object.keys(scope), options.async)
    } catch (err) {
      if (err?.name == "Eta Error") { 
        let firstLine = (err.message as string).split('\n', 1)
        let stack = (err.message as string).substr(firstLine[0].length)

        let match = /.* at line (?<line>\d) col (?<col>\d)/.exec(err.message)

        throw Object.assign(new SkribiEtaSyntaxError(firstLine[0].substr(0, firstLine[0].length - 1)), {
          etaError: err,
          packet: {
            firstLine: firstLine[0],
            stack: stack.trimStart(),
            loc: isExtant(match) && String.isString(template) ? {
              line: match.groups.line,
              col: match.groups.col,
              src: template
            } : null
          }
        })

      } else {
        throw err
      } 
    }
  
    if (options.name) this.templates.define(options.name, {source: (String.isString(template) ? template : null), function: templateFunc});
  
    return {
      func: ((binder) ? templateFunc.bind(binder) : templateFunc),
      unboundFunc: templateFunc
    }
  }
}

/* The unbound function is included because bound functions cannot be toString()-ed, 
which is needed to display the function in the ErrorModal. */
interface templateGet {
  func: TemplateFunctionScoped
  unboundFunc: Function
}