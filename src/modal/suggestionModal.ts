import { FuzzyMatch, FuzzySuggestModal } from "obsidian";
import SkribosPlugin from "src/main";

/* A modal that displays a list of available templates to select from. */
export class SuggestionModal extends FuzzySuggestModal<string> {
  private resolve: (value: string) => void;
  private reject: (reason?: any) => void;

  private plugin: SkribosPlugin
  private manual = false
  constructor(plugin: SkribosPlugin, manualOption?: boolean) {
    super(plugin.app)
    this.plugin = plugin
    this.manual = manualOption
  }

  getItems() {
    // if (this.manual) {
      // return ['%%MANUAL%%'].concat(this.plugin.eta.getCacheKeys())
    // } else {
      return this.plugin.eta.getCacheKeys()
    // }
  }

  renderSuggestion(item: FuzzyMatch<string>, el: HTMLElement) {
    // if (this.manual && item.item == "%%MANUAL%%") {
      // el.
    // } else {
      el.setText(item.item)
    // }
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