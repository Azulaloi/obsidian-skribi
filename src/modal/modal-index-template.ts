import { EventRef, Modal, Setting } from "obsidian";
import { l } from "src/lang/babel";
import SkribosPlugin from "src/main";
import { createRegent } from "src/render/regent";
import { REGENT_CLS } from "src/types/const";
import { makeField } from "src/util/interface";
import { addDocsButton } from "./modal-confirmation";
import { makeErrorModalLink } from "./modal-error";
import { IndexModal } from "./modal-index";

/* A modal that displays an index of all templates. */
export class IndexTemplateModal extends IndexModal {
  listenerRef: EventRef
  templateLoadRef: EventRef

  title: string = l['modal.index.template.title']

  collapsedFields: {
    templates: boolean
    failures: boolean
    styles: boolean
  } = {
    templates: false,
    failures: false,
    styles: false,
  }

  constructor(plugin: SkribosPlugin) {
    super(plugin)
    this.containerEl.addClass("skribi-modal", "skribi-modal-index-templates")
    this.titleEl.setText(this.title)
    addDocsButton(this.titleEl, "misc/index_modal/#template-index")

    this.listenerRef = this.plugin.app.workspace.on('skribi:template-index-modified', () => this.regen())  
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
      this.plugin.handler.recompileTemplates().then(() => {
        Array.from(this.plugin.children).forEach((child) => {
          child.rerender()
        })
        this.regen()
      })
    })
      
    this.contentEl.append(this.fieldsDiv)
    if (this.plugin.initLoaded) {
      this.generateFields(this.fieldsDiv)
    } else {
      this.templateLoadRef = this.plugin.app.workspace.on('skribi:template-init-complete', () => {
        this.generateFields(this.fieldsDiv)
      })
    }
    this.contentEl.createSpan({cls: 'skribi-modal-version-number', text: `SkribosPlugin ${this.app.plugins.plugins["obsidian-skribi"].manifest.version}`})
  }

  onClose() {
    this.plugin.app.workspace.offref(this.listenerRef)
    this.plugin.app.workspace.offref(this.templateLoadRef)
  }

  generateFields(el: HTMLElement) {
    el.empty();

    var templates = this.plugin.handler.loader.templateCache   
    var failures = this.plugin.handler.loader.templateFailures
    var styles = this.plugin.handler.loader.styleCache
  
    /* List Failed Templates */
    let failuresLength = Object.keys(failures.cache).length
    if (failuresLength > 0) {
      let failuresField = makeField("index", el, l._('modal.index.template.listErrored', failuresLength.toString()), true, this.collapsedFields.failures, (state) => {this.collapsedFields.failures = state})
      failuresField.content.addClass('skribi-index-list')
  
      //@ts-ignore
      for (let entry of Object.entries(failures.cache) as [string, TemplateErrorCache][]) {
        let field = createDiv({cls: ['skribi-index-entry', 'skribi-index-entry-failure']})
        field.createDiv({text: entry[1].extension, cls: ['skribi-index-entry-extension', `skribi-index-entry-extension-${entry[1].extension}`]})
        let label = field.createDiv({text: entry[0], cls: 'skribi-index-entry-label'})
        if (entry[1].extension == "md") {
          label.onClickEvent((e) => {
            e.preventDefault();
            this.plugin.app.workspace.openLinkText(entry[0], this.plugin.settings.templateFolder)
            this.close()
          })
        } else {
          label.addClass('skribi-index-entry-label-nolink')
        }

        let r = createRegent({
          class: REGENT_CLS.error, 
          label: 'sk', 
          hover: entry[1].error,
          clear: true
        })
        makeErrorModalLink(r[0], entry[1].error)
        field.append(r[0])
  
        failuresField.content.append(field)
      }
    }

    /* List Compiled Templates */
    let templatesField = makeField("index", el, l._('modal.index.template.listCompiled', Object.keys(templates.cache).length.toString()), true, this.collapsedFields.templates, (state) => {this.collapsedFields.templates = state;console.log(state, this.collapsedFields.templates);})
    //@ts-ignore
    for (let entry of Object.entries(templates.cache).reverse() as [string, TemplateCache][]) {
      let field = createDiv({cls: 'skribi-index-entry'})
      field.createDiv({text: entry[1].extension, cls: ['skribi-index-entry-extension', `skribi-index-entry-extension-${entry[1].extension}`]})
      let label = field.createDiv({text: entry[0], cls: 'skribi-index-entry-label'})
      if (entry[1].extension == "md") {
        label.onClickEvent((e) => {
          e.preventDefault();
          this.plugin.app.workspace.openLinkText(entry[0], this.plugin.settings.templateFolder)
          this.close()
        })
      } else {
        label.addClass('skribi-index-entry-label-nolink')
      } 
      templatesField.content.append(field)
    }
    
    /* List Style Snippets*/
    let stylesLength = Object.keys(styles.cache).length
    if (stylesLength > 0) {
      let stylesField = makeField("index", el, l._('modal.index.template.listStyle', stylesLength.toString()), true, this.collapsedFields.styles, (state) => {this.collapsedFields.styles = state})
  
      //@ts-ignore
      for (let entry of Object.keys(styles.cache)) {
        let field = createDiv({cls: 'skribi-index-entry'})
        field.createDiv({text: "css", cls: ['skribi-index-entry-extension', `skribi-index-entry-extension-css`]})
        let label = field.createDiv({text: entry, cls: ['skribi-index-entry-label', 'skribi-index-entry-label-nolink']})

        stylesField.content.append(field)
      }
    }
  }
}
