import { Provider } from "../../provider_abs";
import { ProviderBus } from "../../provider_bus";
import type WeatherAPI from "../../../../../obsidian-weather/src/api";
import { EventRef } from "obsidian";

export class ProviderWeather extends Provider {
  weatherAPI: WeatherAPI = null

  private eventRefs: {
    ready: EventRef 
    unload: EventRef
    tick: EventRef
  }

  constructor(bus: ProviderBus) {
    super(bus)
  }

  async init() {
    this.checkForAPI()
    console.log("init providerweather")

    this.eventRefs = {
      ready: this.bus.plugin.app.workspace.on("az-weather:api-ready", () => {}),
      unload: this.bus.plugin.app.workspace.on("az-weather:api-unload", () => {}),
      tick: this.bus.plugin.app.workspace.on("az-weather:api-tick", () => {})
    }

    this.functions.set("check", this.provide_predicate())
    this.functions.set("cache", this.provide_dispenseCache())

    return super.init()
  }

  unload() {
    for (let r of Object.values(this.eventRefs)) {
      this.bus.plugin.app.workspace.offref(r)
    }
  }

  checkForAPI() {
    try {
    if (this.bus.plugin.app.plugins.plugins["obsidian-weather"]) {
      this.weatherAPI = this.bus.plugin.app.plugins.plugins["obsidian-weather"].API
    } else {
      this.weatherAPI = null
    }
  } catch(e) {
    console.warn(e)
  }
  }

  hasAPI() {
    return (!!this.weatherAPI)
  }

  predicated(func: Function) {
    return (this.hasAPI()) ? func : () => {return new Error("WeatherPluginAPI not found!")}
  }

  /* Functions */

  provide_predicate(): Function {
    return () => {
      return (!!this.weatherAPI)
    }
  }

  provide_dispenseCache(): Function {
    return this.predicated(this.weatherAPI.dispenseCache.bind(this.weatherAPI))
  }
}