import { AbstractTextComponent, Editor, EditorRangeOrCaret,KeymapEventHandler, Modal, Setting } from "obsidian";
import { l } from "src/lang/babel";
import SkribosPlugin from "../main";
import { fieldPrompt, promptTypes } from "../types/types";
import { isExtant, toDupeRecord } from "../util/util";

export class InsertionModal extends Modal {
  private plugin: SkribosPlugin;
  private editor: Editor;
  private keypressRef: KeymapEventHandler;

  currentID: string;
  textInput: AbstractTextComponent<any>

  valFields: Record<string, string> = {}

  constructor(plugin: SkribosPlugin, editor: Editor, id: string) {
    super(plugin.app)
    this.plugin = plugin;
    this.editor = editor;

    this.currentID = id.toString()

    this.containerEl.addClass("skribi-insertion-modal")
    this.titleEl.setText(l["modal.insert.title"])
  }

  onOpen() {
    this.create()
  }

  create() {
    let s = new Setting(this.contentEl)
    s.addDropdown((drop) => { drop
      .addOptions(toDupeRecord(this.plugin.eta.getCacheKeys()))
      .setValue(this.currentID)
      .onChange((v) => {
        this.currentID = v
        let f = this.generateFields(fieldsDiv, this.currentID);
        ((f.length > 0) ? f[0] : this.textInput).inputEl.focus();
      })
    })

    let fieldsDiv = this.contentEl.createDiv({cls: "skribi-modal-fields"})

    let t = new Setting(this.contentEl)
    t.addText((te) => {this.textInput = te; return te;})
    t.setName(l["modal.insert.append"])
    t.settingEl.addClass("skribi-modal-field-append")

    let f = this.generateFields(fieldsDiv, this.currentID);
    ((f.length > 0) ? f[0] : this.textInput).inputEl.focus();

    let confirm = new Setting(this.contentEl)
    let cb = confirm.addButton((button) => button
      .setButtonText(l["modal.insert.insert"])
      .onClick(() => this.doInsert()))

    this.keypressRef = this.scope.register([], "Enter", this.doInsert.bind(this))
  }

  onClose() {
    this.scope.unregister(this.keypressRef)
  }

  generateFields(el: HTMLElement, id: string) {
    el.empty();

    var arr: AbstractTextComponent<any>[] = [];

    if (this.plugin.eta.templates.get(id)?.frontmatter) {
      let fm = this.plugin.eta.templates.get(id).frontmatter
      let pv = []
      for (let v of Object.keys(fm)) {
        if (v.charAt(0)=="_") {
          let vn = v.substring(1)
          let fma = this.parsePromptVal(vn, fm[v])

          let s = new Setting(el)
          s.settingEl.addClass("skribi-modal-template-field")
          if (fma.type == promptTypes.string) {
            arr.push(this.createTextField(s, fma))
          }
          s.setName(fma.name)
        }
      }
    }

    return arr;
  }

  createTextField(set: Setting, fma: fieldPrompt) {
    let t;
    set.addText((text) => { 
      text
      .setValue(fma.default)
      .setPlaceholder(fma.placeholder)
      .onChange(async (value) => {
        this.valFields[fma.id] = value
      })
      text.inputEl.addClass("skribi-text-input")
      t = text
    })

    if (fma.default.length > 0) this.valFields[fma.id] = fma.default

    return t
  }

  parsePromptVal(k: any, val: any): fieldPrompt {
    let v: fieldPrompt = {
      id: k,
      type: promptTypes.string,
      name: isExtant(val?.name) ? val.name : k,
      placeholder: isExtant(val?.placeholder) ? val.placeholder : "",
      default: isExtant(val?.default) ? val.default : isExtant(val?.def) ? val.def : "",
    }

    return v
  }

  doInsert() {
    let id = this.currentID

    let osel = this.editor.listSelections()
    
    let toInsert = `\`{:${id}`

    for (let e of Object.entries(this.valFields)) {
      toInsert += ` | ${e[0]}: ${e[1]}`
    }

    toInsert += (this?.textInput.getValue().length > 0) ? " | " + this.textInput.getValue() : ""
    toInsert += `}\``

    this.editor.getDoc().replaceSelection(toInsert)

    let nsel: EditorRangeOrCaret[] = [] 
    for (let p of osel) {nsel.push({from: {line: p.anchor.line, ch: p.anchor.ch + (toInsert.length)}})}
    this.editor.transaction({selections: nsel})

    this.close();
  }
}
