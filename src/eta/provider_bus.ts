import SkribosPlugin from "src/main";
import { Stringdex } from "src/types";
import { EtaHandler } from "./eta";
import { ProviderScriptloader } from "./providers/scriptloader";
import { Provider } from "./provider_abs";

export class ProviderBus {
  handler: EtaHandler
  plugin: SkribosPlugin
  providers: Array<Provider> = []

  scriptLoader: ProviderScriptloader;

  curScope: Stringdex = {};

  constructor(handler: EtaHandler) {
    this.handler = handler
    this.plugin = handler.plugin
  }

  async init() {
    this.scriptLoader = new ProviderScriptloader(this);
    await this.scriptLoader.init(); this.providers.push(this.scriptLoader);

    this.createScope()
    return Promise.resolve()
  }

  async reloadProviders() {
    for (let p of this.providers) p.reload();

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
}