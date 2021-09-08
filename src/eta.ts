import * as Eta from "eta";
import { TemplateFunction } from "eta/dist/types/compile";
import { Cacher } from "eta/dist/types/storage";
import { FrontMatterCache, MarkdownRenderer, parseFrontMatterStringArray, parseYaml, TAbstractFile, TFile } from "obsidian";
import SkribosPlugin from "./main";
import { Stringdex } from "./types";
import { getFiles, isExtant, roundTo, vLog, withoutKey } from "./util";

const obsidianModule = require("obsidian");

export class EtaHandler {
  plugin: SkribosPlugin;
  varName: string;

  failedTemplates: Map<string, string> = new Map();
  templateFrontmatters: Map<string, FrontMatterCache> = new Map();

  baseContext: {[index: string]: any} = { 
    obsidian: obsidianModule,
    render: function(str: string) {
      let e = createDiv({cls: "skribi-render-virtual"});
      MarkdownRenderer.renderMarkdown(str, e, this.file.path, null);
      return e.innerHTML
    },
    hasVal: function(v: string) {
      return !(this.v?.[v] == null)
    }/*,
    getWeather: function () {
      let e = null
      //@ts-ignore
      try { e = window.app.plugins.plugins["obsidian-az-style-extender"].weatherHandler.cache }
      catch(e) { console.log(e)}      
    
      return e
    } */
    /*reqIpa: function(str: string) {
      let e: HTMLSpanElement = null;

      //@ts-ignore
      try { e = window.app.plugins.plugins["obsidian-az-ipa-utilities"].requestIPA(str) }
      catch(e) { console.log(e)}

      if (e) {let d = createDiv(); d.appendChild(e); console.log(d.innerHTML); return d.innerHTML}
      else {return null}
    }*/
  }

  constructor(plugin: SkribosPlugin) {
    this.plugin = plugin;
    this.varName = plugin.varName;

    if (!this.plugin.app.workspace.layoutReady) {
      this.plugin.app.workspace.onLayoutReady(async () => this.initPartials())  
    } else this.initPartials();
  }

  async initPartials() {
    this.definePartials(...getFiles(this.plugin.app, this.plugin.settings.templateFolder))
  }

  async definePartials(...files: TFile[]) {
    let t = (files.length == 0) ? window.performance.now() : 0  
    let x = 0
    let x2 = 0

    const reads = files.map(async f => {
      if (!["md", "eta", "txt"].contains(f.extension)) return Promise.resolve();

      let read = await this.plugin.app.vault.cachedRead(f);
      
      let ff = this.plugin.app.metadataCache.getFileCache(f)?.frontmatter
      
      if (ff) {
        let n = (/(?<frontmatter>^---.*?(?=\n---)\n---)/s).exec(read);
        let nf = isExtant(n?.groups?.frontmatter) ? n.groups.frontmatter : null
        if (nf) { read = read.substr(nf?.length || 0); } //console.log(parseFrontMatterStringArray(ff, "prompt"));
      }

      let compiled;
      try {
        compiled = Eta.compile(read, {varName: this.varName})
      } catch(e) {
        this.failedTemplates.set(f.basename, e || "Template failed to compile.")
        console.warn(`Skribi: template "${f.basename}" failed to compile \n`, e)
        Eta.templates.remove(f.basename)
        this.templateFrontmatters.delete(f.basename)
        x++;
      }

      if (isExtant(compiled)) {
        this.failedTemplates.delete(f.basename)
        Eta.templates.define(f.basename, compiled)
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
      vLog(`Updated template "${files[0].basename}" in ${window.performance.now()-t}ms`)
    }
  }

  getPartial(id: string) {return Eta.templates.get(id)}

  hasPartial(id: string) {return isExtant(Eta.templates.get(id))}

  getCache(): Cacher<TemplateFunction> {return Eta.templates}

  getCacheStore(): Record<string, TemplateFunction> {
    //@ts-ignore
    return Eta.templates.cache as Record<string, TemplateFunction>
  }

  getCacheKeys(): string[] {
    return Object.keys(this.getCacheStore())
  }

  async renderAsync(content: string | TemplateFunction, ctxIn?: any, file?: TFile): Promise<string> {
    if (!isFile(file)) return Promise.reject(`Could not identify current file: ${file.path}`);

    let context = Object.assign({file: file}, this.baseContext, ctxIn || {})
    let ren = Eta.renderAsync(content, context, {varName: this.varName})

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
}

const isFile = (item: TAbstractFile) => (item) instanceof TFile; 