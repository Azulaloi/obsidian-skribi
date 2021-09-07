import * as Eta from "eta";
import { TemplateFunction } from "eta/dist/types/compile";
import { MarkdownRenderer, TAbstractFile, TFile } from "obsidian";
import SkribosPlugin from "./main";
import { getFiles, isExtant, roundTo, vLog } from "./util";

const obsidianModule = require("obsidian");

export class EtaHandler {
  plugin: SkribosPlugin;
  varName: string;

  failedTemplates: Map<string, string> = new Map();

  baseContext: {[index: string]: any} = { 
    obsidian: obsidianModule,
    render: function(str: string) {
      let e = createDiv({cls: "skribi-render-virtual"});
      MarkdownRenderer.renderMarkdown(str, e, this.file.path, null);
      return e.innerHTML
    }
  }

  constructor(plugin: SkribosPlugin) {
    this.plugin = plugin;
    this.varName = plugin.varName;

    this.initPartials();
  }

  initPartials() {
    this.plugin.app.workspace.onLayoutReady(async () => this.definePartials(
      ...getFiles(this.plugin.app, this.plugin.settings.templateFolder)
    ))
  }

  definePartials(...files: TFile[]) {
    let t = window.performance.now();
    let x = 0;

    const reads = files.map(async f => {
      let read = await this.plugin.app.vault.read(f)
      let compiled;

      try {
        compiled = Eta.compile(read, {varName: this.varName})
      } catch(e) {
        this.failedTemplates.set(f.basename, e || "Template failed to compile.")
        console.warn(`Skribi: template "${f.basename}" failed to compile \n`, e)
        Eta.templates.remove(f.basename)
        x++;
      }

      if (isExtant(compiled)) {
        this.failedTemplates.delete(f.basename)
        Eta.templates.define(f.basename, compiled)
      }

      return Promise.resolve();
    })

    if (!this.plugin.initLoaded) {
      Promise.allSettled(reads).then(() => {
        // let loaded = files.some((f) => { 
        //   let g = Eta.templates.get(f.basename)
        //   return isExtant(g)
        // })
        let loaded = true;

        if (loaded) {
          let str = `Template folder compiled in: ${roundTo(window.performance.now()-t, 4)} ms`
          if (x) str += `\n Of ${files.length} templates, ${x} failed to compile.`
          vLog(str);
          this.plugin.loadEvents.trigger('init-load-complete')
        } else {
          console.warn("Skribi had trouble loading...")
        }
      })
    } else {
      // let success = files.map((f) => { let g = Eta.templates.get(f.basename) })
      vLog(`Updated template "${files[0].basename}" in ${window.performance.now()-t} ms`)
    }
  }

  getPartial(id: string) {
    return Eta.templates.get(id)
  }

  getCache() {
    return Eta.templates
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