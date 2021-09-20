import DataviewPlugin from "obsidian-dataview/lib/main";
// import { DataviewInlineApi } from "obsidian-dataview/lib/api/inline-api";
import { Provider } from "src/eta/provider_abs";
import { ProviderBus } from "src/eta/provider_bus";
import { DynamicState } from "src/types/types";

export class ProviderDataview extends Provider {
  // dvp: DataviewPlugin = null

  constructor(bus: ProviderBus) {
    super(bus)
  }

  async init() {
    // this.dvp = this.bus.plugin.app.plugins.plugins.dataview as DataviewPlugin || null

    return super.init()
  }

  createObject() {
    return this.bus.plugin.app.plugins.plugins.dataview.api || null
  }

  // createDynamic(state: DynamicState) {
    // let api = new DataviewInlineApi(this.dvp.index, state.child, state.el, this.bus.plugin.app, this.dvp.settings, state.file.path)

    // return this?.dvp?.api || null
  // }
}