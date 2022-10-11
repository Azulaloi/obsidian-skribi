import SkribosPlugin from "src/main";
import { VAR_NAME } from "src/types/const";
import { DynamicState, Stringdex } from "src/types/types";
import { isFunc } from "src/util/util";
import { Handler } from "./handler";
import { ProviderSK } from "./provider/provider-base";
import { ProviderDataview } from "./provider/integration/provider-dataview";
import { ProviderWeather } from "./provider/integration/provider-weather";
import { ProviderScriptloader } from "./provider/provider-scriptloader";
import { IProvider, Provider, ProviderPredicated } from "./provider/provider";

const obsidianModule = require("obsidian");
const MODULE_NAME_INTEGRATIONS: string = 'int';

/** Handles all skript context providers. */
export class ProviderBus {
  handler: Handler
  plugin: SkribosPlugin

  providers: Map<string, Provider> = new Map()
  providersPredicated: Map<string, ProviderPredicated> = new Map()

  scriptLoader: ProviderScriptloader; // Has a reference so that it can be notified by update events
  skBase: ProviderSK;

  private scopeStatic: Stringdex = {}

  // Indicates that a provider has been added or removed, and the static scope should be regenerated.
  isStaticScopeDirty: boolean = false;

  constructor(handler: Handler) {
    this.handler = handler
    this.plugin = handler.plugin
    this.scriptLoader = new ProviderScriptloader(this, 'js'); // assigned here so that we can register file events in handler
  }

  /** Construct all providers but do not initialize them yet, so that we can compile and cache templates ASAP */
  async preInit() {
    this.addTo(this.providers, this.scriptLoader)
    this.addTo(this.providersPredicated, new ProviderDataview(this, 'dv'))
    this.addTo(this.providersPredicated, new ProviderWeather(this, 'weather'))
    this.skBase = new ProviderSK(this, VAR_NAME)
    return Promise.resolve()
  }

  async init() {
    const inits = Object.values(this.execOnProviders('init'))

    await Promise.allSettled(inits)
    this.createStaticScope()
    return Promise.resolve()
  }

  private addTo(providers: Map<string, IProvider>, provider: Provider) {
    providers.set(provider.id, provider)
  }

  /** Integration point for other plugins to add a provider.
   * @param provider `Provider` implementation to add */
  public addProvider = (provider: Provider) => {
    this.providers.set(provider.id, provider)
    this.isStaticScopeDirty = true
    this.handler.recompileTemplates()
  }
  
  /** Integration point for other plugins to add a predicated provider.
   * @param provider `ProviderPredicated` implementation to add */
  addProviderPredicated = (provider: ProviderPredicated) => {
    this.providersPredicated.set(provider.id, provider)
  }

  /** Unloads all providers. */
  unload() {
    this.execOnProviders('unload')
  }

  /** Invoked by providers to indicate their provision must be regenerated. */
  providerNotificationDirty(provider: Provider, isDirty: boolean, ...data: any[]) {
    if (isDirty) this.refreshProvider(provider, ...data)
  }

  /** Regenerate the provision of a single provider, and pass data to its post function. */
  refreshProvider(provider: Provider, ...data: any[]) {
    provider.setDirty(false)
    Object.assign(this.scopeStatic, {[provider.id]: provider.createObject()})
    provider.postDirty(...data)
  }

  /** Clean dirty providers by regenerating their provision. */
  refreshProviders(...providers: Provider[]) {
    let proxy: any = {};

    for (let provider of providers) {
      proxy[provider.id] = provider.createObject()
      provider.setDirty(false)
    }

    Object.assign(this.scopeStatic, proxy)

    providers.forEach(provider => provider.postDirty())
  }

  /** Reload all providers. */
  async reloadProviders() {
    let proms = this.execOnProviders('reload')

    return Promise.allSettled(Object.values(proms))
  }

  /** Gets the current scope object keys. Used for scoping template functions. */
  public getScopeKeys(): string[] {
    return [...this.providers.keys(), MODULE_NAME_INTEGRATIONS, 'moment', 'obsidian']
  }

  /** Prepares and retrieves the composite providers scope object. */
  public getScope(ctx?: DynamicState, refresh?: boolean) {
    let dirties = Object.values(this.providers).filter((p: Provider) => {return p.isDirty})
    if (dirties) this.refreshProviders(...dirties);
    if (this.isStaticScopeDirty) this.createStaticScope();

    return Object.assign({}, this.scopeStatic, {
      [MODULE_NAME_INTEGRATIONS]: this.createPredicatedScope(ctx || null),
      js: this.scriptLoader.createObject(ctx || null) // we're already getting JS from static scope, but we need to getterize it with access to the child
    })
  }

  /** Creates scope object. Should not be used to get the scope. */
  private createStaticScope() {
    let spaces: {[key: string]: any} = {};
    
    for (let p of this.providers) spaces[p[0]] = p[1].createObject();

    spaces['moment'] = window.moment
    spaces['obsidian'] = obsidianModule
    
    this.scopeStatic = spaces
    this.isStaticScopeDirty = false
    return this.scopeStatic
  }

  /** Creates scope objects from predicated providers. */
  createPredicatedScope(ctx?: DynamicState) {
    let spaces: {[key: string]: any} = {};
   
    for (let p of this.providersPredicated) {
      Object.defineProperty(spaces, p[0], { 
        get: function() {
          ctx?.child.sources.integrations.push(p[1].predicatePluginName) // we add the source either way, so that the error child can listen
          if (p[1].predicateCheck()) {
            return p[1].createObject(ctx)
          } else throw new Error(p[1].predicateError())
        }
      })
    }
    
    return spaces
  }

  /** Get the base provider scope. */
  getScopeSK() {
    return this.skBase.createObject()
  }

  /** Invoke function on all providers and return array of results. */
  execOnProviders(func: (keyof IProvider)): Stringdex {
    let rets: Stringdex = {};

    const invoke = (providers: Map<string, Provider>) => {
      for (let p of providers) if ((p != null) && (isFunc(p[1][func]))) {rets[p[0]] = (p[1][func] as Function)()}
    }

    invoke(this.providers)
    invoke(this.providersPredicated)

    return rets
	}
}``

export interface ProviderBus {
  execOnProviders(func: 'reload'): {[index: string]: Promise<void>}
  execOnProvider(func: 'init'): {[index: string]: Promise<void>}
}
