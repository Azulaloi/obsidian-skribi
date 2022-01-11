import { Modal, App } from "obsidian";
import { SkribiError, SkribiSyntaxError, SkribiEvalError, SkribiEtaSyntaxError, SkribiImportError } from "src/engine/error";
import { createRegent, renderError } from "src/render/regent";
import { isExtant } from "src/util/util";
import { linesTableCB, makeField, makeLines, makeLinesTable } from "src/util/interface";
import { REGENT_CLS } from "src/types/const";
import { IndexTemplateModal } from "./modal-index-template";
import { parse, tokenizer } from "acorn";

/* A modal that displays information about the various types of possible errors that may occur when rendering a skribi. 
 * Opened by error regents. */
export class ErrorModal extends Modal {
  error: any = null
  
  constructor(app: App, error?: any) {
    super(app)
    this.error = error
  }

  /* TODO: make this more concise */
  /* TODO: also I should put most of this logic elsewhere so that the console logging can benefit from it */
  async onOpen(){
    var util = require('util')
    let err = this.error
    this.containerEl.addClass("skribi-modal", "skribi-modal-error")

    if (err instanceof SkribiError) {
      this.titleEl.innerText = (err?.name ?? "SkribiError") + ": " + err.message

      if (err instanceof SkribiSyntaxError) {
        /* SyntaxError thrown by JS during function construction */
        this.containerEl.setAttribute('skribi-error-type', 'JavascriptSyntaxError')

        let parseErrMsg = this.contentEl.createDiv({cls: 'skribi-modal-error-message'})
        parseErrMsg.createSpan({text: 'SyntaxError: ', cls: 'sk-label'})
        parseErrMsg.createSpan({text: err.parseError.message, cls: 'sk-msg'})
  
        let compField = makeField("error", this.contentEl, "Compiled Function", true)
        let lines = err.packet.funcLines
        let unrelated = [0, 1, 2, lines.length-1, lines.length-2]
        makeLinesAndPoint(compField.content, lines, {line: err.packet.loc.line, col: err.packet.loc.column}, {linesToMute: unrelated})
        
        if (err?._sk_invocation) {
          let srcField = makeField("error", this.contentEl, "Invocation String", true)
          makeLinesTable(srcField.content, err?._sk_invocation.split(/\r\n|\n/))
        }
  
        if (err?._sk_template) {
          let tempField = makeField("error", this.contentEl, "Template Source", true)
          makeLinesTable(tempField.content, err._sk_template.split(/\r\n|\n/))
        }

        if (err.parseError?.stack) {
          let subErrField = makeField("error", this.contentEl, (err.parseError?.name ?? "UnknownError") + " Stack", true, true)
          makeLinesTable(subErrField.content, err.parseError.stack)
        } else {
          let inspect = util.inspect(err.parseError, true, 7)
          console.log(inspect)
          let subErrField = makeField("error", this.contentEl, (err.parseError?.name ?? "UnknownError") + " Inspection", true, true)
          makeLinesTable(subErrField.content, inspect)
        }

        let errField = makeField("error", this.contentEl, err.name + " Stack", true, true)
        makeLinesTable(errField.content, err.stack)

      } else if (err instanceof SkribiEvalError) {
        /* Error thrown when evaluating the template function */
        this.containerEl.setAttribute('skribi-error-type', 'SkribiEvalError')

        let subErrorMessage = this.contentEl.createDiv({cls: 'skribi-modal-error-message'})
        subErrorMessage.createSpan({text: (err.evalError?.name ?? "UnknownError") + ": ", cls: 'sk-label'})
        subErrorMessage.createSpan({
          text: err.evalError?.message ?? (String.isString(err.evalError) ? err.evalError : "unknown"), 
          cls: 'sk-msg'
        })

        // let errField = makeField(this.contentEl, err.evalError.name + ": " + err.evalError.message)
        // errField.content.setText(err.evalError.stack)

        var match: any = null;
        if (err.evalError?.stack) {
          /* This should find the position trace from certain types of errors */
          match = (/eval at compileWith \([^\n]*,(?: \<[^\:]*\:(?<line>\d*)\:(?<ch>\d*))\)\n/).exec(err.evalError.stack)
        }

        let compField = makeField("error", this.contentEl, "Compiled Function", true, false)
        let lines = err._sk_function.toString().split(/\r\n|\n/)
        let unrelated = [0, 1, 2, 3, 4, lines.length-1, lines.length-2, lines.length-3]
        makeLinesAndPoint(compField.content, lines, match && {line: match.groups.line, col: match.groups.ch}, {linesToMute: unrelated, parseToken: true})

        let invField = makeField("error", this.contentEl, "Invocation String", true)
        makeLinesTable(invField.content, err._sk_invocation)

        if (err?._sk_template) {
          let tempField = makeField("error", this.contentEl, "Template Source", true, isExtant(match))
          makeLinesTable(tempField.content, err._sk_template)
        }

        if (err.evalError?.stack) {
          let subErrField = makeField("error", this.contentEl, (err.evalError?.name ?? "UnknownError") + " Stack", true, true)
          makeLinesTable(subErrField.content, err.evalError.stack)
        } else {
          let inspect = util.inspect(err.evalError, true, 7)
          // console.log(inspect)
          let subErrField = makeField("error", this.contentEl, (err.evalError?.name ?? "UnknownError") + " Inspection", true, true)
          makeLinesTable(subErrField.content, inspect)
        }

        let errField = makeField("error", this.contentEl, err.name + " Stack", true, true)
        makeLinesTable(errField.content, err.stack)
      } else if (err instanceof SkribiEtaSyntaxError) {
        /* Error thrown by Eta when trying to parse a template string */
        this.containerEl.setAttribute('skribi-error-type', 'EtaSyntaxError')
        
        let invField = makeField("error", this.contentEl, "Details", true)
        if (err.packet?.loc) {
          makeLinesAndPoint(invField.content, err.packet.loc.src, {line: err.packet.loc.line, col: err.packet.loc.line})
        } else {
          makeLinesTable(invField.content, err.packet.stack)
        }
      } else if (err instanceof SkribiImportError) {
        /* Error thrown by scriptloader when trying to import a script */
        this.containerEl.setAttribute('skribi-error-type', 'SkriptImportError')

        let ifile = err._sk_importErrorPacket.file;
        let ierr = err._sk_importErrorPacket.err;
        let read = await this.app.vault.adapter.read(ifile.path)

        let subErrorMessage = this.contentEl.createDiv({cls: 'skribi-modal-error-message'})
        subErrorMessage.createSpan({text: `Import Error for '${ifile.name}': `, cls: 'sk-label'})
        let s = subErrorMessage.createSpan({cls: 'sk-msg'})
        s.setText(ierr?.message ?? "")

        let errField = makeField("error", this.contentEl, (ierr?.name ?? "UnknownError") + " Stack", true, true)
        makeLinesTable(errField.content, ierr.stack)
        
        let srcField = makeField("error", this.contentEl, "Script Source", true, !isExtant(pos))

        var pos = null;
        if (ierr instanceof SyntaxError) {
          /* Parse with acorn to get a better location */
          try {
            parse(read, {ecmaVersion: 2020})
          } catch (parseError) {
            if (parseError instanceof SyntaxError) {
              srcField.title.append(createSpan({text: parseError.message, cls: 'skr-errsrcmsg'}))
              //@ts-ignore (acorn parse error)
              pos = {line: parseError.loc.line, col: parseError.loc.column}
            }
          }
        } else {
          match = (/at Object\.<anonymous> \([^\:]*\:[^\:]*\:(?<line>\d*)\:(?<ch>\d*)/.exec(ierr.stack))
          pos = {line: match.groups.line, col: match.groups.ch}
        }

        makeLinesAndPoint(srcField.content, read, pos)
      } else {
        /* Generic SkribiError */
        this.containerEl.setAttribute('skribi-error-type', 'SkribiError')

        if (err?._sk_scriptFailure) {
          /* The template attempted to access a failed scriptloader module */
          let terr = err._sk_scriptFailure as SkribiImportError
          
          let subErrorMessage = this.contentEl.createDiv({cls: 'skribi-modal-error-message'})
          subErrorMessage.createSpan({text: `Import Error for '${terr._sk_importErrorPacket.file.name}': `, cls: 'sk-label'})
          let s = subErrorMessage.createSpan({cls: 'sk-msg'})

          let r = await renderError(createDiv(), terr)
          s.append(r)

          match = (/eval at compileWith \([^\n]*,(?: \<[^\:]*\:(?<line>\d*)\:(?<ch>\d*))\)\n/.exec(err.stack))
          pos = match && {line: match.groups.line, col: match.groups.ch}

          //@ts-ignore
          let func = err?._sk_function
          if (func) {
            let lines = func.toString().split(/\r\n|\n/)
            let invField = makeField("error", this.contentEl, "Compiled Function", true, !isExtant(pos))
            makeLinesAndPoint(invField.content, lines, pos, {
              linesToMute: [0, 1, 2, 3, 4, lines.length-1, lines.length-2, lines.length-3],
              parseToken: true
            })
          }
          
          let stx = err.stack.split(/\r\n|\n/)
          stx[0] = `SkribiError: Could not access scriptloader module from '${terr._sk_importErrorPacket.file.name}', because it failed to import`
          err.stack = stx.join('\n')
        } else if (err?._sk_templateFailure) {
          /* The source template failed to compile */
          let terr = err._sk_templateFailure
  
          let subErrorMessage = this.contentEl.createDiv({cls: 'skribi-modal-error-message'})
          subErrorMessage.createSpan({text: `Compile Error for '${terr.id}': `, cls: 'sk-label'})
          let s = subErrorMessage.createSpan({cls: 'sk-msg'})
          
          let r = createRegent({
            class: REGENT_CLS.error, 
            label: 'sk', 
            hover: (terr.error instanceof SkribiError) 
              ? `${terr.error?.name}: ${terr.error?.message}`
              : (terr.error?.name ?? "Error") + ": " + (terr.error?.msg ?? terr.error?.message ?? "Unknown Error"),
            clear: true
          })
          makeErrorModalLink(r[0], terr.error)
          s.append(r[0])
        } else if (err?._sk_nullTemplate) {
          /* An undefined template was requested */
          let subErrorMessage = this.contentEl.createDiv({cls: 'skribi-modal-error-message'})
          let span = subErrorMessage.createSpan({text: `View Template Index`, cls: 'skr-button'})
          span.addEventListener('click', (ev) => {
            ev.preventDefault()
            let p = new IndexTemplateModal(this.app.plugins.plugins["obsidian-skribi"])
            p.open()
          })
        } else if (err?._sk_errorPacket) {
          /* An internal error has occured that should be displayed */
          let subErrorMessage = this.contentEl.createDiv({cls: 'skribi-modal-error-message'})
          subErrorMessage.createSpan({text: err._sk_errorPacket.name, cls: 'sk-label'})
          subErrorMessage.createSpan({text: err._sk_errorPacket.message, cls: 'sk-msg'})
          
          if (err._sk_errorPacket?.err) {
            if (err._sk_errorPacket.err?.stack) {
              let errField = makeField("error", this.contentEl, (err._sk_errorPacket.err?.name ?? "UnknownError") + " Stack", true, true)
              makeLinesTable(errField.content, err._sk_errorPacket.err.stack)
            }
          }
        }
  
        if (err?.el) {
          this.contentEl.append(err.el)
        }
  
        if (err?.tip) {
          this.contentEl.createDiv({cls: ['skribi-modal-error-message', 'skr-tip']})
          .createSpan({text: err.tip})
        }
  
        if (err?._sk_invocation) {
          let invField = makeField("error", this.contentEl, "Invocation String", true)
          makeLinesTable(invField.content, err._sk_invocation)
        }
        
        if (err?.stack) {
          let errField = makeField("error", this.contentEl, err.name + " Stack", true, true)
          makeLinesTable(errField.content, err.stack)
        }
        
        if (err?._sk_template) {
          let tempField = makeField("error", this.contentEl, "Template Source", true, false)
          makeLinesTable(tempField.content, err._sk_template)
        }
      
      }
    } else {
      /* Non-skribi error, type unknown (may not be instanceof Error) */
      this.containerEl.setAttribute('skribi-error-type', 'Error')

      let errField = makeField("error", this.contentEl, (err?.name ?? "Error") + ": " + (err?.msg ?? err?.message ?? "Unknown Error"), )
      makeLinesTable(errField.content, err?.stack ?? err ?? "")

      if (err?._sk_function) {
        let compField = makeField("error", this.contentEl, "Compiled Function")
        compField.content.setText(err._sk_function)
      }

      if (err?._sk_invocation) {
        let srcField = makeField("error", this.contentEl, "Invocation String")
        makeLines(srcField.content, err?._sk_invocation ?? "")
      }

      if (!err?.stack) {
        let inspect = util.inspect(err, true, 7)
        let subErrField = makeField("error", this.contentEl, (err?.evalError?.name ?? "Unknown") + " Inspection", true, true)
        makeLinesTable(subErrField.content, inspect)
      }
    }

    this.modalEl.createSpan({cls: 'skribi-modal-version-number', text: `SkribosPlugin ${this.app.plugins.plugins["obsidian-skribi"].manifest.version}`})
  }
}

/** Adds an click event listener to 'el' that opens an error modal for the error 'err'. */
export function makeErrorModalLink(el: HTMLElement, err: any): HTMLElement {
  el.addClass("has-link")
  el.addEventListener('click', (ev) => {
    ev.preventDefault()
    let p = new ErrorModal(window.app, err);
    p.open();
  })
	return el
}

export interface errorPosition {
  offset?: number
  line: number
  col: number
}

export interface pointOptions {
  linesToMute?: number[]
  parseToken?: boolean
}

export function makeLinesAndPoint(el: HTMLElement, read: string | string[], pos: errorPosition, opt?: pointOptions) {
  //@ts-ignore | Sanitize
  pos = pos && {line: parseInt(pos.line), col: parseInt(pos.col)}
  
  makeLinesTable(el, read, (pos) ? (ind: number, els: linesTableCB) => {
    if (opt?.linesToMute?.contains(ind)) els.row.addClass('skribi-line-extraneous');

    if (ind == (pos.line-1)) {
      els.row.addClass('skribi-line-errored')
      let z = (pos.col === 0)
      let text = els.con.textContent

      let charEnd = opt?.parseToken 
        ? pos.col + tokenizer(text.substr(pos.col-1), {"ecmaVersion": 2020}).getToken().end - 1
        : pos.col

      let pre = z ? `` : text.substring(0, pos.col-1)
      let char = z ? text.substring(pos.col, charEnd+1) : text.substring(pos.col-1, charEnd)
      let post = z ? text.substring(charEnd+1) : text.substring(charEnd)

      let toHTML = z ? `` : `<span>${pre}</span>`
      toHTML += `<span class="skr-err-ch">${char}</span><span>${post}</span>`
      els.con.innerHTML = toHTML

      /*
      let tabs = text.match(/\t/g)
      let tt = tabs?.length ?? 0
      let pstr = ("".padStart(tt, "	"))
      pstr += ("^".padStart(pos.col-tt))      
      */

      let pstr = pre.replace(/[^\s]/g, " ") + "^"

      let row = els.table.insertRow()
      row.addClass("skribi-line-pointer")
      let numCell = row.insertCell()
      numCell.setText("@")
      numCell.addClass("skr-numcell", "skr-pointer")
      let conCell = row.insertCell()
      conCell.setText(pstr)
      conCell.addClass("skr-concell", "skr-pointer")
    }
  }: null)
}