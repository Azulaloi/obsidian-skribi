import { FuzzySuggestModal } from "obsidian";
import SkribosPlugin from "src/main";

export class SuggestionModal extends FuzzySuggestModal<string> {
  private resolve: (value: string) => void;
  private reject: (reason?: any) => void;

  private plugin: SkribosPlugin
  constructor(plugin: SkribosPlugin) {
    super(plugin.app)
    this.plugin = plugin
  }

  getItems() {
    return this.plugin.eta.getCacheKeys()
  }

  getItemText(item: string): string {return item}

  onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
    this.resolve(item)
  }

  async openAndGetValue(resolve: (value: string) => void, reject: () => void): Promise<void> {
    this.resolve = resolve
    this.reject = reject
    this.open()
  }
}