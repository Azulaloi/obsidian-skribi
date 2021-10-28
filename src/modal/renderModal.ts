import { Component, MarkdownSectionInformation, Modal, Setting } from "obsidian";
import SkribosPlugin from "src/main";
import { EBAR, Modes } from "src/types/const";
import { toDupeRecord } from "src/util/util";

export default class RenderModal extends Modal {
  private plugin: SkribosPlugin
  templateKey: string;
  renderEl: HTMLElement
  component: Component

  constructor(plugin: SkribosPlugin, templateKey: string) {
    super(plugin.app)
    this.plugin = plugin
    this.templateKey = templateKey.toString()
    this.renderEl = this.contentEl.createDiv({cls: ['skribi-modal-render-container', 'markdown-preview-view']})
    this.component = new Component()
  }

  onOpen() {
    this.render()
    this.component.load()
  }

  render() {
    this.renderEl.empty()
    this.renderEl.createEl('code', {text: `{:${this.templateKey}}`})

    let container = createDiv()
    let el = createDiv()

    this.plugin.processor.processEntry({srcType: Modes.general}, this.renderEl, {
      remainingNestLevel: 4,
      docId: '555555555',
      frontmatter: null,
      sourcePath: "",
      addChild: (child: any) => {this.component.addChild(child)},
      getSectionInfo: () => {return null as MarkdownSectionInformation},
      containerEl: container,
      el: el
    }, 4, false, null).catch((err) => {console.log("renderModal Error:", EBAR, err)})
  }

  onClose() {
    this.component.unload()
    // this.renderEl.empty()
  }
}