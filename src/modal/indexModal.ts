import { EventRef, Modal, Setting } from "obsidian";
import { TemplateCache, TemplateErrorCache } from "src/eta/templates";
import SkribosPlugin from "src/main";
import { createRegent } from "src/render/regent";
import { REGENT_CLS } from "src/types/const";
import { makeField } from "src/util/interface";
import { makeErrorModalLink } from "./errorModal";

export class IndexModal extends Modal {
  private plugin: SkribosPlugin;
  fieldsDiv: HTMLDivElement
  listenerRef: EventRef
  
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
    super(plugin.app)
    this.plugin = plugin;

    this.containerEl.addClass("skribi-modal-index")
    this.titleEl.setText("Skribi Template Index")
    this.fieldsDiv = createDiv({cls: "skribi-modal-fields"})
    this.listenerRef = this.plugin.app.workspace.on('skribi:template-index-modified', () => this.regen())  
  }

  // TODO: Create a pseudochild listener
  onOpen() {
    let refresh = new Setting(this.contentEl)
    let refreshButton = refresh.addButton((button) => button
      .setButtonText("Refresh Index")
      .onClick(() => this.regen()))

    let recomp = new Setting(this.contentEl)
    let recompButton = recomp.addButton((button) => button
      .setButtonText("Recompile All")
      .onClick(() => {
        this.plugin.eta.recompileTemplates().then(() => {
          Array.from(this.plugin.children).forEach((child) => {
            child.rerender()
          })
          this.regen()
        })
      }))
      
    this.contentEl.append(this.fieldsDiv)
    this.generateFields(this.fieldsDiv)
    this.contentEl.createSpan({cls: 'skribi-modal-version-number', text: `SkribosPlugin ${this.app.plugins.plugins["obsidian-skribi"].manifest.version}`})
  }

  regen() {
    this.fieldsDiv.empty(); 
    this.generateFields(this.fieldsDiv);
  }

  onClose() {
    this.plugin.app.workspace.offref(this.listenerRef)
  }

  generateFields(el: HTMLElement) {
    el.empty();

    var templates = this.plugin.eta.loader.templateCache   
    var failures = this.plugin.eta.loader.templateFailures
    var styles = this.plugin.eta.loader.styleCache
    
    let failuresLength = Object.keys(failures.cache).length
    if (failuresLength > 0) {
      let failuresField = makeField("index", el, "Errored Templates", true, this.collapsedFields.failures, (state) => {this.collapsedFields.failures = state})
      failuresField.title.textContent += ` (${failuresLength} Total)`
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

    let templatesField = makeField("index", el, "Templates", true, this.collapsedFields.templates, (state) => {this.collapsedFields.templates = state;console.log(state, this.collapsedFields.templates);})
    templatesField.title.textContent += ` (${Object.keys(templates.cache).length} Total)`
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

    let stylesLength = Object.keys(styles.cache).length
    if (stylesLength > 0) {
      let stylesField = makeField("index", el, "Style Snippets", true, this.collapsedFields.styles, (state) => {this.collapsedFields.styles = state})
      stylesField.title.textContent += ` (${stylesLength} Total)`
  
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