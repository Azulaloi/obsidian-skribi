import { ProviderPredicated } from "../../provider_abs";
// import type WeatherAPI from "../../../../../obsidian-weather/src/api";
import { EventRef } from "obsidian";

/* Integration module for my WIP weather plugin (https://github.com/Azulaloi/obsidian-weather) */
export class ProviderWeather extends ProviderPredicated {
  predicatePluginName: string = 'obsidian-weather'

  private eventRefs: {
    ready: EventRef 
    unload: EventRef
    tick: EventRef
  }

  async init() {
    this.eventRefs = {
      ready: this.bus.plugin.app.workspace.on("az-weather:api-ready", () => {}),
      unload: this.bus.plugin.app.workspace.on("az-weather:api-unload", () => {}),
      tick: this.bus.plugin.app.workspace.on("az-weather:api-tick", () => {})
    }

    this.functions.set("check", this.provide_predicate())
    this.functions.set("cache", this.provide_dispenseCache())
    this.functions.set("tickEventRef", this.provide_tickEventRef())

    return super.init()
  }

  unload() {
    for (let r of Object.values(this.eventRefs)) {
      this.bus.plugin.app.workspace.offref(r)
    }
  }

  /* Provisions */

  provide_predicate(): Function {
    return () => {
      return (!!this.weatherAPI)
    }
  }

  provide_dispenseCache(): Function {
    return () => {
      let p: any = this.getPredicate();
      return p?.API?.dispenseCache.bind(p.API)()
    } 
  }

  provide_tickEventRef(): Function {
    return (cb: Function) => {
      return this.bus.plugin.app.workspace.on("az-weather:api-tick", (...a: any) => cb(...a))
    }
  }
}