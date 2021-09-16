import SkribosPlugin from "src/main";
import { Stringdex } from "src/types";
import { EtaHandler } from "./eta";
import { ProviderWeather } from "./providers/integration";
import { ProviderScriptloader } from "./providers/scriptloader";
import { IProvider, Provider } from "./provider_abs";

export class ProviderBus {
  handler: EtaHandler
  plugin: SkribosPlugin
  providers: Array<Provider> = []

  scriptLoader: ProviderScriptloader;

  curScope: Stringdex = {};

  constructor(handler: EtaHandler) {
    this.handler = handler
    this.plugin = handler.plugin

    this.scriptLoader = new ProviderScriptloader(this);
  }

  async init() {    
    // await this.scriptLoader.init().then(() => this.providers.push(this.scriptLoader))

    this.providers.push(this.scriptLoader)
    this.providers.push(new ProviderWeather(this))

    const inits = this.providers.map(async (p) => {return await p.init()})

    await Promise.allSettled(inits)
    this.createScope()
    return Promise.resolve()
  }

  unload() {
    this.execOnProviders('unload')
    // for (let p of this.providers) p.unload()
  }

  async reloadProviders() {
    this.execOnProviders('reload')
    // for (let p of this.providers) p.reload();

    return Promise.resolve() // not actually awaiting reloads
  }

  getScope(refresh?: boolean) {
    return (refresh ? this.createScope : this.curScope) 
  }

  createScope() {
    let spaces: {[key: string]: any} = {};
    
    for (let p of this.providers) spaces[p.namespace] = p.createObject();

    this.curScope = spaces
    return this.curScope
  }

  execOnProviders(...func: (keyof IProvider)[]) {
    for (let p of this.providers) if (p != null) 
      for (let f of func) if (isFunc(p[f])) (p[f] as Function)(); 
	}
}

const isFunc = (v: any) => (v instanceof Function)