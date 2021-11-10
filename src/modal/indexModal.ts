import { Modal } from "obsidian";
import SkribosPlugin from "src/main";

export class IndexModal extends Modal {
  plugin: SkribosPlugin;
  fieldsDiv: HTMLDivElement

  title: string = "Index"

  constructor(plugin: SkribosPlugin) {
    super(plugin.app)
    this.plugin = plugin

    this.fieldsDiv = createDiv({cls: "skribi-modal-fields"})
  }

  regen() {
    this.fieldsDiv.empty(); 
    this.fieldsDiv.toggleClass('refresh', true)
    this.generateFields(this.fieldsDiv);
    setTimeout(() => {this.fieldsDiv.toggleClass('refresh', false)}, 40)
  }

  generateFields(el: HTMLElement) {}
}