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

/* Handles all script function providers */
export class ProviderBus {
  handler: EtaHandler
  plugin: SkribosPlugin

  providers: Map<string, Provider> = new Map()
  providersDynamic: Map<string, Provider> = new Map()

  /* Has a reference so that it can be notified by update events */
  scriptLoader: ProviderScriptloader;

  skBase: ProviderSK;

  private scopeStatic: Stringdex = {}

  constructor(handler: EtaHandler) {
    this.handler = handler
    this.plugin = handler.plugin

    this.scriptLoader = new ProviderScriptloader(this, 'js');
  }

  async init() {
    this.addProvider(this.scriptLoader)
    this.addProvider(new ProviderWeather(this, 'weather'))

    this.addProviderDynamic(new ProviderDataview(this, 'dv'))

    this.skBase = new ProviderSK(this, 'sk')

    const inits = Object.values(this.execOnProviders('init')) //Array.from(this.providers).map(async (p) => {return await p[1].init()})

    await Promise.allSettled(inits)
    this.createStaticScope()
    return Promise.resolve()
  }

  addProvider = (provider: Provider) => this.providers.set(provider.id, provider)
  addProviderDynamic = (provider: Provider) => this.providersDynamic.set(provider.id, provider)

  unload() {
    this.execOnProviders('unload')
  }

  /* Invoked by providers to indicate their provision must be regenerated */
  providerNotificationDirty(provider: Provider, isDirty: boolean) {
    if (isDirty) this.refreshProvider(provider)
  }

  /* Clean dirty providers by regenerating their provision */
  refreshProvider(...providers: Provider[]) {
    let proxy: any = {};

    for (let provider of providers) {
      proxy[provider.id] = provider.createObject()
      provider.setDirty(false)
    }

    Object.assign(this.scopeStatic, proxy)
  }

  /* Reloads all providers */
  async reloadProviders() {
    let proms = this.execOnProviders('reload')

    return Promise.allSettled(Object.values(proms))
  }

  /* Retrieves scope object */
  public getScope(ctx?: DynamicState, refresh?: boolean) {
    let dirties = Object.values(this.providers).filter((p: Provider) => {return p.isDirty})
    if (dirties) this.refreshProvider(...dirties)

    return Object.assign({}, this.scopeStatic, this.createDynamicScope(ctx || null))
  }

  /* Create scope object */
  createStaticScope() {
    let spaces: {[key: string]: any} = {};
    
    for (let p of this.providers) spaces[p[0]] = p[1].createObject();

    // Temporary, until I implement an API load/unload listener
    // if (this.plugin.app.plugins.enabledPlugins.has("dataview")) spaces['dv'] = new ProviderDataview(this, 'dv').createObject()

    spaces['moment'] = window.moment
    spaces['obsidian'] = obsidianModule
    
    this.scopeStatic = spaces
    return this.scopeStatic
  }

  /* Used for providers that need to generate their provision with knowledge of context. 
    Currently there are no such providers so this is unused (thought I was gonna need it for dataview) */
  createDynamicScope(ctx?: DynamicState) {
    let spaces: {[key: string]: any} = {
      get dv() {
        return this.plugin
      }
    };
  
    // for (let p of this.providersDynamic) spaces[p[0]] = p[1].createObject();

    return spaces
  }

  /* Get the base provider scope*/
  getScopeSK() {
    return this.skBase.createObject()
  }

  /* Invoke function on all providers and return array of results */
  execOnProviders(func: (keyof IProvider)): Stringdex {
    let rets: Stringdex = {};

    for (let p of this.providers) if ((p != null) && (isFunc(p[1][func]))) {
      rets[p[0]] = (p[1][func] as Function)() }
    return rets
	}
}

export interface ProviderBus {
  execOnProviders(func: 'reload'): {[index: string]: Promise<void>}
  execOnProvider(func: 'init'): {[index: string]: Promise<void>}
}

const isFunc = (v: any) => (v instanceof Function)