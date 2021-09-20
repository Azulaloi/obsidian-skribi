import { MarkdownRenderer } from "obsidian";
import SkribosPlugin from "src/main";
import { DynamicState, Stringdex } from "src/types/types";
import { EtaHandler } from "./eta";
import { ProviderSK } from "./providers/base";
import { ProviderDataview } from "./providers/integration/dv";
import { ProviderWeather } from "./providers/integration/weather";
import { ProviderScriptloader } from "./providers/scriptloader";
import { IProvider, Provider } from "./provider_abs";

const obsidianModule = require("obsidian");

export class ProviderBus {
  handler: EtaHandler
  plugin: SkribosPlugin

  providers: Map<string, Provider> = new Map()
  providersDynamic: Map<string, Provider> = new Map()

  /* Has a reference so that it can be notified by update events */
  scriptLoader: ProviderScriptloader;

  skBase: ProviderSK;

  scopeStatic: Stringdex = {}

  constructor(handler: EtaHandler) {
    this.handler = handler
    this.plugin = handler.plugin

    this.scriptLoader = new ProviderScriptloader(this);
  }

  async init() {    
    this.providers.set('s', this.scriptLoader);
    this.providers.set('weather', new ProviderWeather(this))

    // this.providersDynamic.set('dv', new ProviderDataview(this))

    this.skBase = new ProviderSK(this)

    const inits = Array.from(this.providers).map(async (p) => {return await p[1].init()})

    await Promise.allSettled(inits)
    this.createStaticScope()
    return Promise.resolve()
  }

  unload() {
    this.execOnProviders('unload')
  }

  async reloadProviders() {
    this.execOnProviders('reload')

    return Promise.resolve() // not actually awaiting reloads
  }

  getScope(ctx?: DynamicState, refresh?: boolean) {
    return this.scopeStatic
    // return (ctx) ? Object.assign({}, this.scopeStatic, this.createDynamicScope(ctx)) : this.scopeStatic
  }

  createStaticScope() {
    let spaces: {[key: string]: any} = {};
    
    for (let p of this.providers) spaces[p[0]] = p[1].createObject();

    if (this.plugin.app.plugins.enabledPlugins.has("dataview")) spaces['dv'] = new ProviderDataview(this).createObject()

    spaces['moment'] = window.moment
    spaces['obsidian'] = obsidianModule
    
    this.scopeStatic = spaces
    return this.scopeStatic
  }

  createDynamicScope(ctx: DynamicState) {
    let spaces: {[key: string]: any} = {};
  
    for (let p of this.providersDynamic) spaces[p[0]] = p[1].createObject();

    return spaces
  }

  getBase() {
    return this.skBase.createObject()
  }

  execOnProviders(...func: (keyof IProvider)[]) {
    for (let p of this.providers) if (p != null) 
      for (let f of func) if (isFunc(p[1][f])) (p[1][f] as Function)(); 
	}
}

const isFunc = (v: any) => (v instanceof Function)