import { EventRef, MarkdownRenderer } from "obsidian";
import { Provider } from "src/engine/provider/provider";
import { createRegent } from "src/render/regent";
import { CLS, REGENT_CLS } from "src/types/const";
import { Stringdex } from "src/types/types";
import { SkribiAbortError } from "../error";

/* Provides skript functions for the 'sk' object */
export class ProviderSK extends Provider {
  async init() {
    return super.init()
  }

  createObject() {
    return {
      render: function(str: string) {
        let e = createDiv({cls: CLS.virtual});
        //console.log(this)
        MarkdownRenderer.renderMarkdown(str, e, this.ctx?.file?.path ?? "", null);
        return e.innerHTML
      },
      has: function(v: string) {
        return !((this.v?.[v] == null) || (this.v?.[v] == undefined))
      },
      abort: function(msg?: string, dataIn?: Stringdex) {
        let data = dataIn ?? {}
        let err = new SkribiAbortError(msg ?? "Evaluation Aborted")
        err.name = data?.name ?? err.name

        let abortPacket = Object.assign({cls: REGENT_CLS.abort, hover: err.message}, data ?? {})
        throw Object.assign(err, {_sk_abortPacket: abortPacket})
      },
      getTemplateSource: function(s: string): Promise<any> {
        return makeInitPromise(this.child, () => {
          let has = this.ctx.plugin.handler.loader.styleCache.has(s)
          if (!has) {console.warn(`Skribi: getTemplateSource()\n Could not find requested template '${s}'\n`, this.child._c)}
          let c = this.ctx.plugin.handler.loader.templateCache.get(s)
          if (has && !c?.source) {console.warn(`Skribi: getTemplateSource()\n Template '${s}' found, but has no cached source\n`, this.child._c)}
          return c?.source ?? null
        })
      },
      getStyle: function(s: string): Promise<any> {
        return makeInitPromise(this.child, () => {
          if (!this.ctx.plugin.handler.loader.styleCache.has(s)) {console.warn(`Skribi: getStyle()\n Could not find requested style '${s}.css'\n`, this.child._c)}
          return this.ctx.plugin.handler.loader.styleCache.get(s)
        })
      },
      /**
       * @param styleSnip The ID of a .css file that is expected to be present in the style cache
       * @returns A promise for the scoped style (resolves on post) */
      includeStyle: async function(styleSnip: string, scope: boolean = true) { //TODO: fails on initload for non-templates
        return makeInitPromise(this.child, async () => {
          this.child._c.listenFor("style", styleSnip)
          return this.child.addStyle(await this.getStyle(styleSnip), scope)
        })
      },
      // util: require('util'),
      createRegent: createRegent
    }
  }
}

type eventConstructor = {on(id: string, cb: Function): EventRef, offref(event: EventRef): any}
type eventPossessor = {registerEvent(event: EventRef): void}

function makeInitPromise(child: eventPossessor, cb: Function) {
  if (window.app.plugins.plugins['obsidian-skribi'].initLoaded) {
    return Promise.resolve(cb())
  } else return makeEventPromise(child, window.app.workspace, 'skribi:template-init-complete', cb)
}

function makeEventPromise(child: eventPossessor, eventConstructor: eventConstructor, eventName: string, cb: Function) {
  return new Promise((resolve, reject) => {
    //console.log("makeEventPromise", this)
    let x = eventConstructor.on(eventName, () => {
      eventConstructor.offref(x)
      resolve(cb())
    })

    child.registerEvent(x)
  })
}