import { MarkdownRenderer } from "obsidian";
import { Provider } from "src/eta/provider_abs";
import SkribosPlugin from "src/main";
import { Stringdex } from "src/types/types";

export class ProviderSK extends Provider {
  async init() {
    return super.init()
  }

  createObject() {
    return {
      render: function(str: string) {
        let e = createDiv({cls: "skribi-render-virtual"});
        console.log(this)
        MarkdownRenderer.renderMarkdown(str, e, this.ctx.file.path, null);
        return e.innerHTML
      },
      has: function(v: string) {
        return !((this.v?.[v] == null) || (this.v?.[v] == undefined))
      },
      abort: function(s: string | Stringdex) {
        let abortPacket = String.isString(s) 
        ? {hasData: true, flag: 'abort', hover: s} 
        : Object.assign({hasData: true, flag: 'abort'}, s)
        throw abortPacket
      },
      getTemplateSource: function(s: string): Promise<any> {
        let plugin = this.ctx.plugin as SkribosPlugin

        return plugin.initLoaded 
        ? Promise.resolve(plugin.eta.loader.templateCache.get(s)?.source ?? null)
        : (() => { return new Promise((resolve, reject) => {
            let x = plugin.app.workspace.on('skribi:template-init-complete', () => {
              plugin.app.workspace.offref(x)
              resolve(plugin.eta.loader.templateCache.get(s)?.source ?? null)
            })

            this.registerEvent(x)
          })})()
      },
      getStyle: function(s: string): Promise<any> {
        let plugin = this.ctx.plugin as SkribosPlugin
        
        return plugin.initLoaded 
        ? Promise.resolve(plugin.eta.loader.styleCache.get(s)) 
        : (() => { return new Promise((resolve, reject) => {
            let x = plugin.app.workspace.on('skribi:template-init-complete', () => {
              plugin.app.workspace.offref(x)
              resolve(plugin.eta.loader.styleCache.get(s))
            })

            this.registerEvent(x)
          })})()
      },
      includeStyle: async function(s: string) {
        if (this.ctx.plugin.eta.loader.styleCache.has(s)) {
          this.child._c.listenFor("style", s)
          return this.child.addStyle(await this.getStyle(s))
        }
      }
    }
  }
}