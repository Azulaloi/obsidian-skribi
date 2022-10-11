import { AbstractTextComponent, KeymapEventHandler, MarkdownSectionInformation, Modal, Setting } from "obsidian";
import { l } from "src/lang/babel";
import { SkribiChild } from "src/render/child";
import { Modes } from "src/types/const";
import SkribosPlugin from "../main";
import { average, linkDocs, roundTo, vLog } from "../util/util";
import { addDocsButton, makeExternalLink } from "./modal-confirmation";

const maximumIterations = 10000

/** A modal which renders skribis in bulk, for testing purposes. Probably not very useful to users. */
export class TestModal extends Modal {
  private plugin: SkribosPlugin;
  private keypressRef: KeymapEventHandler;

  textFieldToEval: AbstractTextComponent<any>
  iterations: number = 10;
  multiBlock: boolean = false;

  resultsField: HTMLElement

  valFields: Record<string, string> = {}

  textIn: string
  autofill: {
    type: string
    value: string
  } = null

  constructor(plugin: SkribosPlugin, autofill?: {type: string, value: string}) {
    super(plugin.app)
    this.plugin = plugin;
    this.autofill = autofill
    
    this.containerEl.addClass("skribi-test-modal")
    this.titleEl.setText(l['modal.perf.title'])

    // let desc = createDiv({cls: 'skribi-modal-desc'})
    // makeExternalLink(desc.createEl('a', {text: l['documentation'], attr: {'href': linkDocs('commands/performance')}}))
    addDocsButton(this.titleEl, 'commands/#performance-test')
    // desc.insertAfter(this.titleEl)
  }

  onOpen() {
    this.create()
  }

  create() {
    let fieldTextToEval = new Setting(this.contentEl)
    fieldTextToEval.addTextArea((text) => {this.textFieldToEval = text; return text})
    fieldTextToEval.setName(l["modal.perf.textToEvaluate.name"])
    fieldTextToEval.setDesc(l["modal.perf.textToEvaluate.desc"])
    this.textFieldToEval.setPlaceholder(l["modal.perf.textToEvaluate.placeholder"])
    if (this.autofill) {
      fieldTextToEval.infoEl.append(createDiv({text: `Autofilled from ${this.autofill.type}`, cls: 'setting-item-description skribi-autofill-notification'}))
      this.textFieldToEval.setValue(this.autofill.value)
    }

    let fieldIterations = new Setting(this.contentEl)
    let iters: HTMLInputElement = fieldIterations.controlEl.createEl('input', {attr: {type: 'number'}})
    iters.defaultValue = this.iterations.toString()
    iters.onchange = (ev) => {this.iterations = iters.valueAsNumber}
    fieldIterations.setName(l["modal.perf.evalIterations.name"])
    fieldIterations.setDesc(l["modal.perf.textToEvaluate.desc"])

    let blockSetting = new Setting(this.contentEl)
    blockSetting.addToggle((tog) => {
      tog.setValue(this.multiBlock)
      tog.onChange((v) => this.multiBlock = v)
      return tog
    })
    blockSetting.setName(l["modal.perf.evalBlocks"])

    let confirm = new Setting(this.contentEl).setClass('skribi-button-eval')
    confirm.addButton((button) => button
      .setButtonText(l["modal.perf.evaluate"])
      .onClick(() => this.doEval()))
    this.keypressRef = this.scope.register([], "Enter", this.doEval.bind(this))

    this.contentEl.createEl('hr')

    this.resultsField = this.contentEl.createDiv({cls: "skribi-test-results-field"})
  }

  onClose() {
    this.scope.unregister(this.keypressRef)
  }

  async doEval() {
    if (!this.plugin.initLoaded) {
      this.resultsField.setText("Template cache not ready!")
      return; 
    }

    let container = createDiv()
    let blocksToProcess: HTMLElement[] = []
    let toIter = Math.min(this.iterations, maximumIterations)
    if (this.multiBlock) {
      for (let i = 0; i < toIter; i++) {
        let d = container.createDiv()
        d.createEl('code', {text: this.textFieldToEval.getValue()})
        blocksToProcess.push(d)
      }
    } else {
      let singleDiv = container.createDiv()
      for (let i = 0; i < toIter; i++) {
        singleDiv.createEl('code', {text: this.textFieldToEval.getValue()})
      }
      blocksToProcess.push(singleDiv)
    }

    const timeStart = window.performance.now()
    const children: SkribiChild[] = []

    const proms: Promise<[[], number, number]>[] = blocksToProcess.map(async (div) => {
      let promiseStartTime = window.performance.now()
      let promise = await this.plugin.processor.processEntry({srcType: Modes.general}, div, {
        remainingNestLevel: 4,
        docId: '55555555',
        frontmatter: null,
        sourcePath: this.plugin.app.workspace.getActiveFile()?.path || "",
        addChild: (child: any) => {children.push(child)},
        getSectionInfo: () => {return null as MarkdownSectionInformation},
        containerEl: container,
        el: div
      }, 4, false, null).catch(() => {})

      return [promise, window.performance.now(), promiseStartTime] as any
    })

    this.resultsField.setText(l["modal.perf.evaluating"])
    let settledValues = await Promise.allSettled(proms)
    
    vLog(`Performance test settled in: ${roundTo(window.performance.now()-timeStart, 3)}ms`)

    let fullfilled: [any[], number, number][] = settledValues.map((v) => {if (v.status == 'fulfilled') return v.value})
    let times = fullfilled.map((result) => (result[1] as number - (result[2] as number)))
    let avg = average(...times)
    
    let p: any[] = []
    fullfilled.map(res => res[0].map((a) => p.push(a)))
    let childrenFromPromises = (await Promise.allSettled(p)).map((rez) => {
      if (rez.status == "fulfilled") return rez.value?.[0]
    })
    
    this.resultsField.setText(`${l["modal.perf.results"]} (${childrenFromPromises.length} children in ${ l._((times.length > 1 ? "modal.perf.resultsBlockCount.plural" : "modal.perf.resultsBlockCount.single"), times.length.toString())}): ${roundTo(avg, 3)}ms`)
  
    Array.from(childrenFromPromises).forEach((child: SkribiChild | undefined) => child?.clear())
    children.forEach((c: any) => c?.clear())  
    blocksToProcess.map(block => block.remove()) // Children are easier to collect when they lack shelter
    container.remove() // One day, the last person who remembers you will die, and you will be forgotten forever
  }
}

