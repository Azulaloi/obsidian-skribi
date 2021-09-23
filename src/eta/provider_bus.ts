import { App, MarkdownRenderer } from "obsidian";
import SkribosPlugin from "src/main";
import { DynamicState, Stringdex, Stringdexed } from "src/types/types";
import { isFunc } from "src/util";
import { EtaHandler } from "./eta";
import { ProviderSK } from "./providers/base";
import { ProviderDataview } from "./providers/integration/dv";
import { ProviderWeather } from "./providers/integration/weather";
import { ProviderScriptloader } from "./providers/scriptloader";
import { IProvider, Provider, ProviderPredicated } from "./provider_abs";

const obsidianModule = require("obsidian");

const MODULE_NAME_INTEGRATIONS: string = 'int';

/* Handles all script function providers */
export class ProviderBus {

  handler: EtaHandler
  plugin: SkribosPlugin

  providers: Map<string, Provider> = new Map()
  providersPredicated: Map<string, ProviderPredicated> = new Map()

  /* Has a reference so that it can be notified by update events */
  scriptLoader: ProviderScriptloader;

  skBase: ProviderSK;

  private scopeStatic: Stringdex = {}

  // Indicates that a provider has been added or removed, and the static scope should be regenerated.
  isStaticScopeDirty: boolean = false;

  constructor(handler: EtaHandler) {
    this.handler = handler
    this.plugin = handler.plugin

    this.scriptLoader = new ProviderScriptloader(this, 'js'); // assigned here so that we can register file events in handler
  }

  async init() {
    this.addProvider(this.scriptLoader, true)

    this.addProviderPredicated(new ProviderDataview(this, 'dv'), true)
    this.addProviderPredicated(new ProviderWeather(this, 'weather'), true)

    this.skBase = new ProviderSK(this, this.handler.varName)

    const inits = Object.values(this.execOnProviders('init'))

    await Promise.allSettled(inits)
    this.createStaticScope()
    return Promise.resolve()
  }

  /**
   * @param provider IProvider object to add
   * @param suppress Set true to not mark scope as dirty */
  addProvider = (provider: Provider, suppress?: boolean) => {
    this.providers.set(provider.id, provider)
    if (!suppress) this.isStaticScopeDirty = true
  }
  
  addProviderPredicated = (provider: ProviderPredicated, suppress?: boolean) => {
    this.providersPredicated.set(provider.id, provider)
    if (!suppress) this.isStaticScopeDirty = true
  }

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

  /* Retrieves providers object */
  public getScope(ctx?: DynamicState, refresh?: boolean) {
    let dirties = Object.values(this.providers).filter((p: Provider) => {return p.isDirty})
    if (dirties) this.refreshProvider(...dirties)

    if (this.isStaticScopeDirty) this.createStaticScope()

    let proxy: Stringdex = {}
    proxy[MODULE_NAME_INTEGRATIONS] = this.createPredicatedScope(ctx || null)

    return Object.assign({}, this.scopeStatic, proxy)
  }

  /* Creates scope object. Should not be used to get the scope. */
  private createStaticScope() {
    let spaces: {[key: string]: any} = {};
    
    for (let p of this.providers) spaces[p[0]] = p[1].createObject();

    spaces['moment'] = window.moment
    spaces['obsidian'] = obsidianModule
    
    this.scopeStatic = spaces
    this.isStaticScopeDirty = false
    return this.scopeStatic
  }

  /* Predicated providers */
  createPredicatedScope(ctx?: DynamicState) {
    let spaces: {[key: string]: any} = {};
   
    for (let p of this.providersPredicated) {
      Object.defineProperty(spaces, p[0], { get: function() {
          if (p[1].predicateCheck()) return p[1].createObject()
          else throw new Error(p[1].predicateError())
        } 
      })
    }
    
    return spaces
  }

  /* Get the base provider scope */
  getScopeSK() {
    return this.skBase.createObject()
  }

  /* Invoke function on all providers and return array of results */
  execOnProviders(func: (keyof IProvider)): Stringdex {
    let rets: Stringdex = {};

    const invoke = (providers: Map<string, Provider>) => {
      for (let p of providers) if ((p != null) && (isFunc(p[1][func]))) {rets[p[0]] = (p[1][func] as Function)()}
    }

    invoke(this.providers)
    invoke(this.providersPredicated)

    return rets
	}
}

export interface ProviderBus {
  execOnProviders(func: 'reload'): {[index: string]: Promise<void>}
  execOnProvider(func: 'init'): {[index: string]: Promise<void>}
}
