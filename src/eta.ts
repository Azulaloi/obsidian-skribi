import * as Eta from "eta";
import { TemplateFunction } from "eta/dist/types/compile";
import { App, Events, MarkdownRenderer, TAbstractFile, TFile } from "obsidian";
import { resolve } from "path";
import { embedMedia } from "./embed";
import SkribosPlugin from "./main";
import { getFiles, isExtant } from "./util";

const obsidianModule = require("obsidian");

export class EtaHandler {
  plugin: SkribosPlugin;
  varName: string;

  baseContext: {[index: string]: any} = { 
    obsidian: obsidianModule,
    render: function(str: string) {
      let e = createDiv();
      MarkdownRenderer.renderMarkdown(str, e, this.file.path, null);
      return e.innerHTML
    }
  }

  constructor(plugin: SkribosPlugin) {
    this.plugin = plugin;
    this.varName = plugin.varName;

    this.plugin.app.workspace.onLayoutReady(async () => this.definePartials(
      ...getFiles(this.plugin.app, this.plugin.settings.templateFolder)
    ))
  }

  definePartials(...files: TFile[]) {
    let t = window.performance.now();
    
    const reads = files.map(async f => {
      let read = await this.plugin.app.vault.read(f)
      Eta.templates.define(f.basename, Eta.compile(read, {varName: this.varName}))
    })

    if (!this.plugin.initLoaded) {
      Promise.allSettled(reads).then(() => {
        let loaded = files.every((f) => { 
          let g = Eta.templates.get(f.basename)
          return isExtant(g)
        })

        if (loaded) {
          this.plugin.loadEvents.trigger('init-load-complete')
          console.log(`Template folder compiled in: ${window.performance.now()-t} ms`)
        } else {
          console.warn("Skribi had trouble loading...")
        }
      })
    } else {
      console.log(`Updated template "${files[0].basename}" in ${window.performance.now()-t} ms`)
    }
  }

  getPartial(id: string) {
    return Eta.templates.get(id)
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