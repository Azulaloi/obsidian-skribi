import { AbstractTextComponent, KeymapEventHandler, MarkdownSectionInformation, Modal, Setting } from "obsidian";
import { Modes } from "src/types/const";
import SkribosPlugin from "../main";
import { average,  linkToDocumentation, makeExternalLink, roundTo, vLog } from "../util";

const maximumIterations = 10000

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
    this.titleEl.setText("Skribi Performance Test")

    let desc = createDiv({cls: 'skribi-modal-desc'})
    makeExternalLink(desc.createEl('a', {text: 'Documentation', attr: {'href': linkToDocumentation('commands/performance')}}))

    desc.insertAfter(this.titleEl)
  }

  onOpen() {
    this.create()
  }

  create() {
    let fieldTextToEval = new Setting(this.contentEl)
    fieldTextToEval.addTextArea((text) => {this.textFieldToEval = text; return text})
    fieldTextToEval.setName('Text To Evaluate')
    fieldTextToEval.setDesc('Text is evaluated as the contents of a code span.')
    this.textFieldToEval.setPlaceholder(`{~ console.log('Hello World'); }`)
    if (this.autofill) {
      fieldTextToEval.infoEl.append(createDiv({text: `Autofilled from ${this.autofill.type}`, cls: 'setting-item-description skribi-autofill-notification'}))
      this.textFieldToEval.setValue(this.autofill.value)
    }

    let fieldIterations = new Setting(this.contentEl)
    let iters: HTMLInputElement = fieldIterations.controlEl.createEl('input', {attr: {type: 'number'}})
    iters.defaultValue = this.iterations.toString()
    iters.onchange = (ev) => {this.iterations = iters.valueAsNumber}
    fieldIterations.setName('Evaluation Iterations')
    fieldIterations.setDesc('How many times should the text be evaluated?')

    let blockSetting = new Setting(this.contentEl)
    blockSetting.addToggle((tog) => {
      tog.setValue(this.multiBlock)
      tog.onChange((v) => this.multiBlock = v)
      return tog
    })
    blockSetting.setName('Eval As Individual Blocks?')

    let confirm = new Setting(this.contentEl).setClass('skribi-button-eval')
    confirm.addButton((button) => button
      .setButtonText("Evaluate")
      .onClick(() => this.doEval()))
    this.keypressRef = this.scope.register([], "Enter", this.doEval.bind(this))

    this.contentEl.createEl('hr')

    this.resultsField = this.contentEl.createDiv({cls: "skribi-test-results-field"})
  }

  onClose() {
    this.scope.unregister(this.keypressRef)
  }

  async doEval() {
    let container = createDiv()
    let el = createDiv()

    let blocksToProcess: HTMLElement[] = []
    let toIter = Math.min(this.iterations, )
    if (this.multiBlock) {
      for (let i = 0; i < this.iterations; i++) {
        let d = createDiv()
        d.createEl('code', {text: this.textFieldToEval.getValue()})
        blocksToProcess.push(d)
      }
    } else {
      let singleDiv = createDiv()
      for (let i = 0; i < this.iterations; i++) {
        singleDiv.createEl('code', {text: this.textFieldToEval.getValue()})
      }
      blocksToProcess.push(singleDiv)
    }

    let timeStart = window.performance.now()

    const proms: Promise<[[], number, number]>[] = blocksToProcess.map(async (div) => {
      let promiseStartTime = window.performance.now()

      let promise = await this.plugin.processor({srcType: Modes.general}, div, {
        remainingNestLevel: 4,
        docId: '55555555',
        frontmatter: null,
        sourcePath: this.plugin.app.workspace.getActiveFile().path,
        addChild: (child: any) => {},
        getSectionInfo: () => {return null as MarkdownSectionInformation},
        containerEl: container,
        el: el
      }, 4, false, null).catch(() => {})

      return [promise, window.performance.now(), promiseStartTime] as any
    })

    this.resultsField.setText('Evaluating...')

    let settledValues = await Promise.allSettled(proms)

    vLog(`Performance test settled in: ${roundTo(window.performance.now()-timeStart, 3)}ms`)

    let fullfilled: [[], number, number][] = settledValues.map((v) => {if (v.status == 'fulfilled') return v.value})
    let times = fullfilled.map((result) => (result[1] as number - (result[2] as number)))
    let avg = average(...times)
    this.resultsField.setText(`Average fulfillment time (${times.length} block${times.length > 1 ? 's' : ''}): ${roundTo(avg, 3)}ms`)
  
    el.detach()
  }
}

