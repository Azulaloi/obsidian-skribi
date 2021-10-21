import { Modal, App } from "obsidian";
import { SkribiSyntaxError } from "src/eta/comp";
import { l } from "src/lang/babel";
import { kls } from "src/util";
import { confirmationModal } from "./confirmationModal";

type errorModalPacket = {
  error: any
}

export class ErrorModal extends Modal {
  private resolve: (value: string) => void;
  private reject: (reason?: any) => void;

  error: any = null
  
  constructor(app: App, error?: any) {
    super(app)
    this.error = error
  }

  onOpen(){
    var util = require('util')
    let err = this.error
    

    var errorField: HTMLElement;

    if (err instanceof SkribiSyntaxError) {  
      this.titleEl.innerText = err.message

      // errorField = this.contentEl.createDiv({cls: "skribi-modal-error-field-error"})
      // errorField.innerText = err.packet.funcLines.join('\n')

      let parseErrMsg = this.contentEl.createDiv({cls: 'skribi-modal-error-parseErrMsg'})
      parseErrMsg.createSpan({text: 'SyntaxError: ', cls: 'sk-label'})
      parseErrMsg.createSpan({text: err.parseError.message, cls: 'sk-msg'})

      let compField = makeField(this.contentEl, "Compiled Function")
      let lines = err.packet.funcLines
      let unrelated = [0, 1, 2, lines.length-1, lines.length-2]
      makeLines(compField.content, lines, (ind: number, els: any) => {
        if (unrelated.contains(ind)) {
          els.lineEl.addClass('skribi-line-extraneous')
        }

        if (ind == err.packet.loc.line-1) {
          els.lineEl.addClass('skribi-line-errored')
          let pstr = "^".padStart(err.packet.loc.column)
          let lineEl = createDiv({cls: "skribi-modal-error-field-line skerr-pointer"})
          lineEl.createDiv({text: "@", cls: "skribi-line-number skerr-pointer"})
          lineEl.createDiv({text: pstr, cls: "skribi-line-content skerr-pointer"})
          compField.content.append(lineEl)
        }
      })

      let srcField = makeField(this.contentEl, "Source String")
      makeLines(srcField.content, err.skSrc.split(/\r\n|\n/))

      // console.log(util.inspect(err, true, 7, true))
    } else {
      console.log(Object.getPrototypeOf(err))
      console.log(err.msg)
      console.log(util.inspect(err, true, 7, true))

      let errField = makeField(this.contentEl, (err?.name ?? "Error") + ": " + (err?.msg ?? err?.message ?? "Unknown Error"), )
      errField.content.setText(err.stack)

      let srcField = makeField(this.contentEl, "Source String")
      makeLines(srcField.content, err.skSrc.split(/\r\n|\n/))
    }

    // var util = require('util')
    // console.log(util.inspect(this.error, true, 7, true))
    // console.log(Object.getPrototypeOf(this.error) == SkribiSyntaxError.prototype)

    // if (String.isString(this?.error)) 
    // errorField.innerText = this.error?.msg?.stack ?? this.error
    // console.log(this.error)

  }
}

function makeLines(fieldEl: HTMLElement, lines: string[], 
  cb?: (ind: number, els: {lineEl: HTMLElement, numEl: HTMLElement, conEl: HTMLElement}) => any) 
{
  for (let i = 0; i < lines.length; i++) {
    let lineEl = createDiv({cls: "skribi-modal-error-field-line"})
    let numEl = lineEl.createDiv({text: (i+1).toString(), cls: "skribi-line-number"})
    let conEl = lineEl.createDiv({text: lines[i], cls: "skribi-line-content"})
    
    fieldEl.append(lineEl)
    if (cb) {cb(i, {lineEl: lineEl, numEl: numEl, conEl: conEl})} 
  }
}

function makeField(containerEl: HTMLElement, name: string) {
  let fieldContainer = createDiv({"cls": "skribi-modal-error-field-container"})
  let fieldTitle = fieldContainer.createDiv({text: name, cls: "skribi-modal-error-field-title"})
  let fieldContent = fieldContainer.createDiv({cls: "skribi-modal-error-field-content"})

  containerEl.append(fieldContainer)
  return {
    container: fieldContainer,
    title: fieldTitle,
    content: fieldContent
  }
}

export function makeErrorModalLink(el: HTMLElement, err: any): HTMLElement {
  el.addClass("has-link")
  el.addEventListener('click', (ev) => {
    ev.preventDefault()

    let p = new ErrorModal(window.app, err);
    p.open();
  })

	return el
}
