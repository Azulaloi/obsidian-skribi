import { Component, MarkdownSectionInformation, Modal, Setting } from "obsidian";
import SkribosPlugin from "src/main";
import { EBAR, Modes } from "src/types/const";
import { Stringdex } from "src/types/types";
import { toDupeRecord } from "src/util/util";

export default class RenderModal extends Modal {
  private plugin: SkribosPlugin
  templateKey: string;
  renderEl: HTMLElement
  component: Component
  // values: Stringdex = {}
  append: string

  constructor(plugin: SkribosPlugin, templateKey: string, append?: string) {
    super(plugin.app)
    this.plugin = plugin
    this.templateKey = templateKey.toString()
    // this.values = values ?? {}
    this.append = append

    this.renderEl = this.contentEl.createDiv({cls: ['skribi-modal-render-container', 'markdown-preview-view']})
    this.modalEl.addClass('skribi-modal-render')
    this.modalEl.setAttribute('skribi-render-modal-key', templateKey)
    this.component = new Component()
  }

  onOpen() {
    this.render()
    this.component.load()
  }

  render() {
    this.renderEl.empty()
    let txt = `{:${this.templateKey}`
    /*txt += Object.entries(this.values).reduce((prev: string, cur: string) => {
      return prev + `| ${cur[0]}: ${cur[1]}`
    }, "") */
    txt += this?.append ?? ""
    txt += '}'
    console.log(txt)
    this.renderEl.createEl('code', {text: txt})

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