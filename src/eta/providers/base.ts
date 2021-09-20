import { MarkdownRenderer } from "obsidian";
import { Provider } from "src/eta/provider_abs";
import { ProviderBus } from "src/eta/provider_bus";
import { Stringdex } from "src/types/types";

export class ProviderSK extends Provider {
  constructor(bus: ProviderBus) {
    super(bus)
  }

  async init() {
    return super.init()
  }

  createObject() {
    return {
      render: function(str: string) {
        let e = createDiv({cls: "skribi-render-virtual"});
        console.log(this)
        MarkdownRenderer.renderMarkdown(str, e, this.this.file.path, null);
        return e.innerHTML
      },
      has: function(v: string) {
        return !((this.v?.[v] == null) || (this.v?.[v] == undefined))
      },
      abort: function(s: string | Stringdex) {
        let abortPacket = String.isString(s) 
        ? {hasData: true, flag: 'abort', hover: s} 
        : Object.assign({hasData: true, flag: 'abort'}, s)
        throw abortPacket
      },
    }
  }
}