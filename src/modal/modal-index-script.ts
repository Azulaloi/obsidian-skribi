import { EventRef } from "obsidian";
import { l } from "src/lang/babel";
import SkribosPlugin from "src/main";
import { renderError } from "src/render/regent";
import { makeField } from "src/util/interface";
import { addDocsButton } from "./modal-confirmation";
import { IndexModal } from "./modal-index";

/* A modal that displays an index of all scripts. */
export class IndexScriptModal extends IndexModal {
  listenerRef: EventRef
  
  title: string = l['modal.index.script.title']

  collapsedFields: {
    scripts: boolean
    failures: boolean
  } = {
    scripts: false,
    failures: false,
  }

  constructor(plugin: SkribosPlugin) {
    super(plugin)
    this.containerEl.addClass("skribi-modal", "skribi-modal-index-scripts")
    this.titleEl.setText(this.title)
    addDocsButton(this.titleEl, "misc/index_modal/#script-index")

    //@ts-ignore
    this.listenerRef = this.plugin.app.workspace.on('skribi:script-index-modified', () => this.regen())  
  }

  onOpen() {
    let buttonsEl = this.contentEl.createDiv({cls: "skribi-modal-index-buttons"})

    let refreshButton = buttonsEl.createEl('button')
    refreshButton.setText(l['modal.index.gen.refresh'])
    refreshButton.onClickEvent((ev) => {
      this.regen()
    })

    let recompButton = buttonsEl.createEl('button')
    recompButton.setText(l['modal.index.gen.recomp'])
    recompButton.onClickEvent((ev) => {
      this.plugin.handler.bus.scriptLoader.reload().then(() => {
        Array.from(this.plugin.children).forEach((child) => {
          child.rerender()
        })
        this.regen()
      })
    })
      
    this.contentEl.append(this.fieldsDiv)
    this.generateFields(this.fieldsDiv)
    this.contentEl.createSpan({cls: 'skribi-modal-version-number', text: `SkribosPlugin ${this.app.plugins.plugins["obsidian-skribi"].manifest.version}`})
  }

  onClose() {
    this.plugin.app.workspace.offref(this.listenerRef)
  }

  async generateFields(el: HTMLElement) {
    el.empty();

    var modules = this.plugin.handler.bus.scriptLoader.loadedModules
    var failures = this.plugin.handler.bus.scriptLoader.failedModules
    
    if (failures.size > 0) {
      let failuresField = makeField("index", el, l._('modal.index.script.listErrored', failures.size.toString()), true, this.collapsedFields.failures, (state) => {this.collapsedFields.failures = state})
      failuresField.content.addClass('skribi-index-list')
  
      for (let entry of failures.entries()) {
        let field = createDiv({cls: ['skribi-index-entry', 'skribi-index-entry-failure']})
        field.createDiv({text: 'js', cls: ['skribi-index-entry-extension', `skribi-index-entry-extension-js`]})
        let label = field.createDiv({text: entry[0], cls: 'skribi-index-entry-label'})
        label.addClass('skribi-index-entry-label-nolink')

        let r = await renderError(createDiv(), entry[1])
        field.append(r)
  
        failuresField.content.append(field)
      }
    }

    let modulesField = makeField("index", el, l._('modal.index.script.listCompiled', modules.size.toString()), true, this.collapsedFields.scripts, (state) => {this.collapsedFields.scripts = state;})
    for (let entry of modules.entries()) {
      let field = createDiv({cls: 'skribi-index-entry'})
      field.createDiv({text: 'js', cls: ['skribi-index-entry-extension', `skribi-index-entry-extension-js`]})
      let label = field.createDiv({text: entry[0], cls: 'skribi-index-entry-label'})
      label.addClass('skribi-index-entry-label-nolink')

      modulesField.content.append(field)
    }
  }
}
