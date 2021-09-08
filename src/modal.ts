import { AbstractTextComponent, App, Editor, EditorRangeOrCaret, EditorSelection, FuzzySuggestModal, KeymapEventHandler, Modal, Setting, TextComponent } from "obsidian";
import SkribosPlugin from "./main";

export class InsertionModal extends Modal {
  private plugin: SkribosPlugin;
  private editor: Editor;
  private keypressRef: KeymapEventHandler;

  currentSelection: string;
  textInput: AbstractTextComponent<any>

  constructor(plugin: SkribosPlugin, editor: Editor, id: string) {
    super(plugin.app)
    this.plugin = plugin;
    this.editor = editor;

    this.currentSelection = id.toString()

    this.containerEl.addClass("skribi-insertion-modal")
    this.titleEl.setText("Insert Skribi Template")
  }

  onOpen() {
    this.create()
  }

  create() {
    let c = this.contentEl.createDiv()

    let t = new Setting(this.contentEl)
    let te = t.addText((te) => {this.textInput = te; te.inputEl.focus(); return te})

    let confirm = new Setting(this.contentEl)
    let cb = confirm.addButton((button) => button
      .setButtonText("Insert")
      .onClick(() => this.doInsert()))

    this.keypressRef = this.scope.register([], "Enter", this.doInsert.bind(this))
  }

  onClose() {
    this.scope.unregister(this.keypressRef)
  }

  doInsert() {
    let id = this.currentSelection

    let osel = this.editor.listSelections()
    
    let toInsert = `\`{:${id + ((this?.textInput.getValue().length > 0) ? " | " + this.textInput.getValue() : "")}}\``
    this.editor.getDoc().replaceSelection(toInsert)

    let nsel: EditorRangeOrCaret[] = [] 
    for (let p of osel) {nsel.push({from: {line: p.anchor.line, ch: p.anchor.ch + (toInsert.length)}})}
    this.editor.transaction({selections: nsel})

    this.close();
  }
}

export interface tPacket {
  id: string
}

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

function toRecord(arr: string[]): Record<string, string> {
  return arr.reduce((a, i) => ({...a, [i]: i}), {} as Record<string, string>)
}