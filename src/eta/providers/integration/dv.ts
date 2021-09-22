import { EventRef } from "obsidian";
import DataviewPlugin from "obsidian-dataview/lib/main";
// import { DataviewInlineApi } from "obsidian-dataview/lib/api/inline-api";
import { Provider } from "src/eta/provider_abs";
import { ProviderBus } from "src/eta/provider_bus";
import { DynamicState } from "src/types/types";

export class ProviderDataview extends Provider {
  // dvp: DataviewPlugin = null

  eventRef_API_READY: EventRef

  async init() {
    // this.dvp = this.bus.plugin.app.plugins.plugins.dataview as DataviewPlugin || null

    this.eventRef_API_READY = this.bus.plugin.app.metadataCache.on('dataview:api-ready', (api) => {this.apiReady()})

    return super.init()
  }

  unload() {
    this.bus.plugin.app.metadataCache.offref(this.eventRef_API_READY)
  }

  createObject() {

    
    return this.check()
    ? this.bus.plugin.app.plugins.plugins.dataview.api || null
    : null
  }

  check() {
    return this.bus.plugin.app.plugins.enabledPlugins.has("dataview")
  }

  apiReady() {

  }

  // createDynamic(state: DynamicState) {
    // let api = new DataviewInlineApi(this.dvp.index, state.child, state.el, this.bus.plugin.app, this.dvp.settings, state.file.path)

    // return this?.dvp?.api || null
  // }
}

const DV_API_FUNCTIONS = ['']