import { getLineInfo, tokenizer } from "acorn";
import { Modal, App, setIcon } from "obsidian";
import { SkribiError, SkribiSyntaxError, SkribiEvalError } from "src/eta/error";
import { createRegent, REGENT_CLS } from "src/render/regent";
import { isExtant } from "src/util";

type errorModalPacket = {
  error: any
}

export class ErrorModal extends Modal {
  error: any = null
  
  constructor(app: App, error?: any) {
    super(app)
    this.error = error
  }

  /* TODO: make this more concise */
  /* TODO: also I should put most of this logic elsewhere so that the console logging can benefit from it */
  onOpen(){
    var util = require('util')
    let err = this.error
    this.containerEl.addClass("skribi-modal-error")

    if (err instanceof SkribiError) {
      this.titleEl.innerText = "SkribiError: " + err.message

      if (err instanceof SkribiSyntaxError) {
        let parseErrMsg = this.contentEl.createDiv({cls: 'skribi-modal-error-parseErrMsg'})
        parseErrMsg.createSpan({text: 'SyntaxError: ', cls: 'sk-label'})
        parseErrMsg.createSpan({text: err.parseError.message, cls: 'sk-msg'})
  
        let compField = makeField(this.contentEl, "Compiled Function", true)
        let lines = err.packet.funcLines
        let unrelated = [0, 1, 2, lines.length-1, lines.length-2]
        // console.log(getLineInfo(err.packet.funcLines.join("\n"), err.packet.pos))
        // let len = err.packet.raisedAt - err.packet.pos
        makeLinesTable(compField.content, lines, (ind: number, els: linesTableCB) => {
          if (unrelated.contains(ind)) {
            els.row.addClass('skribi-line-extraneous')
          }
  
          if (ind == err.packet.loc.line-1) {
            let text = els.con.textContent
            let pre = text.substring(0, err.packet.loc.column-1)
            let char = text.substring(err.packet.loc.column-1, err.packet.loc.column)
            let post = text.substring(err.packet.loc.column)

            // let pre = text.substring(0, err.packet.loc.column)
            // let char = text.substring(err.packet.loc.column, )
            // let post = text.substring(err.packet.loc.column + len)

            // console.log(err.packet)
            els.con.innerHTML = `<span>${pre}</span><span class="skr-err-ch">${char}</span><span>${post}</span>`
            // console.log([pre, char, post])

            els.row.addClass('skribi-line-errored')
            let pstr = "^".padStart(err.packet.loc.column)
            let row = els.table.insertRow()
            row.addClass("skribi-line-pointer")
            let numCell = row.insertCell()
            numCell.setText("@")
            numCell.addClass("skr-numcell", "skr-pointer")
            let conCell = row.insertCell()
            conCell.setText(pstr)
            conCell.addClass("skr-concell", "skr-pointer")
          }
        })
        
        if (err?._sk_invocation) {
          let srcField = makeField(this.contentEl, "Invocation String", true)
          makeLinesTable(srcField.content, err?._sk_invocation.split(/\r\n|\n/))
        }
  
        if (err?._sk_template) {
          let tempField = makeField(this.contentEl, "Template Source", true)
          makeLinesTable(tempField.content, err._sk_template.split(/\r\n|\n/))
        }

        if (err.parseError?.stack) {
          let subErrField = makeField(this.contentEl, (err.parseError?.name ?? "UnknownError") + " Stack", true, true)
          makeLinesTable(subErrField.content, err.parseError.stack)
        } else {
          let inspect = util.inspect(err.parseError, true, 7)
          console.log(inspect)
          let subErrField = makeField(this.contentEl, (err.parseError?.name ?? "UnknownError") + " Inspection", true, true)
          makeLinesTable(subErrField.content, inspect)
        }

        let errField = makeField(this.contentEl, err.name + " Stack", true, true)
        makeLinesTable(errField.content, err.stack)

      } else if (err instanceof SkribiEvalError) {
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
          // match = (/at Object.eval \([^\n]*,(?: \<[^\:]*\:(?<line>\d*)\:(?<ch>\d*))\)\n/).exec(err.evalError.stack)
          // console.log(match)
        }

        let compField = makeField(this.contentEl, "Compiled Function", true, false)
        let lines = err._sk_function.toString().split(/\r\n|\n/)
        let unrelated = [0, 1, 2, 3, 4, lines.length-1, lines.length-2, lines.length-3]
        makeLinesTable(compField.content, lines, isExtant(match) ? (ind: number, els: linesTableCB) => {
          if (unrelated.contains(ind)) {
            els.row.addClass('skribi-line-extraneous')
          }

          if (ind == match.groups.line-1) {
            let text = els.con.textContent
            let pre = text.substring(0, match.groups.ch-1)
            let char = text.substring(match.groups.ch-1, match.groups.ch)
            let post = text.substring(match.groups.ch)

            // let tokens = [...tokenizer(lines[ind].substr(match.groups.ch-1), {"ecmaVersion": 2020})]
            // console.log(tokens)

            els.con.innerHTML = `<span>${pre}</span><span class="skr-err-ch">${char}</span><span>${post}</span>`
            // console.log([pre, char, post])

            els.row.addClass('skribi-line-errored')
            let pstr = "^".padStart(match.groups.ch)
            let row = els.table.insertRow()
            row.addClass("skribi-line-pointer")
            let numCell = row.insertCell()
            numCell.setText("@")
            numCell.addClass("skr-numcell", "skr-pointer")
            let conCell = row.insertCell()
            conCell.setText(pstr)
            conCell.addClass("skr-concell", "skr-pointer")
          }
        }: undefined)

        let invField = makeField(this.contentEl, "Invocation String", true)
        makeLinesTable(invField.content, err._sk_invocation)

        if (err?._sk_template) {
          let tempField = makeField(this.contentEl, "Template Source", true)
          makeLinesTable(tempField.content, err._sk_template)
        }

        if (err.evalError?.stack) {
          let subErrField = makeField(this.contentEl, (err.evalError?.name ?? "UnknownError") + " Stack", true, true)
          makeLinesTable(subErrField.content, err.evalError.stack)
        } else {
          let inspect = util.inspect(err.evalError, true, 7)
          // console.log(inspect)
          let subErrField = makeField(this.contentEl, (err.evalError?.name ?? "UnknownError") + " Inspection", true, true)
          makeLinesTable(subErrField.content, inspect)
        }

        let errField = makeField(this.contentEl, err.name + " Stack", true, true)
        makeLinesTable(errField.content, err.stack)
      } else {
        /* Generic SkribiError */

        if (err?._sk_templateFailure) {
          let terr = err._sk_templateFailure

          let subErrorMessage = this.contentEl.createDiv({cls: 'skribi-modal-error-message'})
          subErrorMessage.createSpan({text: `Compile Error for '${terr.id}': `, cls: 'sk-label'})
          let s = subErrorMessage.createSpan({cls: 'sk-msg'})
          
          let r = createRegent({
            class: REGENT_CLS.error, 
            label: 'sk', 
            hover: (terr.error instanceof SkribiError) 
              ? `${terr.error.name}: ${terr.error.message}`
              : (terr.error.name ?? "Error") + ": " + (terr.error?.msg ?? terr.error?.message ?? "Unknown Error"),
            clear: true
          })
          makeErrorModalLink(r[0], terr.error)
          s.append(r[0])
        }

        let invField = makeField(this.contentEl, "Invocation String", true)
        makeLinesTable(invField.content, err._sk_invocation)

        let errField = makeField(this.contentEl, err.name + " Stack", true, true)
        makeLinesTable(errField.content, err.stack)

        if (err?._sk_template) {
          let tempField = makeField(this.contentEl, "Template Source", true)
          makeLinesTable(tempField.content, err._sk_template)
        }
      }
    } else {
      /* Non-skribi error, type unknown (may not be instanceof Error) */

      let errField = makeField(this.contentEl, (err?.name ?? "Error") + ": " + (err?.msg ?? err?.message ?? "Unknown Error"), )
      makeLinesTable(errField.content, err?.stack ?? err ?? "")

      if (err?._sk_function) {
        let compField = makeField(this.contentEl, "Compiled Function")
        compField.content.setText(err._sk_function)
      }

      if (err?._sk_invocation) {
        let srcField = makeField(this.contentEl, "Invocation String")
        makeLines(srcField.content, err?._sk_invocation ?? "")
      }

      if (!err?.stack) {
        let inspect = util.inspect(err, true, 7)
        let subErrField = makeField(this.contentEl, (err.evalError?.name ?? "Unknown") + " Inspection", true, true)
        makeLinesTable(subErrField.content, inspect)
      }
    }

    this.contentEl.createSpan({cls: 'skribi-modal-version-number', text: `SkribosPlugin ${this.app.plugins.plugins["obsidian-skribi"].manifest.version}`})
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

function makeLines(fieldEl: HTMLElement, linesIn: string | string[], 
  cb?: (ind: number, els: {lineEl: HTMLElement, numEl: HTMLElement, conEl: HTMLElement}) => any) 
{
  let lines = (Array.isArray(linesIn) ? linesIn : linesIn.split(/\r\n|\n/))

  for (let i = 0; i < lines.length; i++) {
    let lineEl = createDiv({cls: "skribi-modal-error-field-line"})
    let numEl = lineEl.createDiv({text: (i+1).toString(), cls: "skribi-line-number"})
    let conEl = lineEl.createDiv({text: lines[i], cls: "skribi-line-content"})
    
    fieldEl.append(lineEl)
    if (cb) {cb(i, {lineEl: lineEl, numEl: numEl, conEl: conEl})} 
  }
}

interface linesTableCB {
  table: HTMLTableElement, row: HTMLTableRowElement, 
  num: HTMLTableCellElement, con: HTMLTableCellElement
}
function makeLinesTable(fieldEl: HTMLElement, linesIn: string | string[],
  cb?: (ind: number, els: linesTableCB) => any)
{
  let lines = (Array.isArray(linesIn) ? linesIn : linesIn.split(/\r\n|\n/))
  let tab = createEl('table', {cls: "skr-lines-table"}) 
  let colGroup = tab.createEl('colgroup')
  colGroup.append(createEl('col', {cls: 'skr-table-colnum'}), createEl('col', {cls: 'skr-table-colcon'}))

  for (let i = 0; i < lines.length; i++) {
    let row = tab.insertRow()
    let numCell = row.insertCell()
    let conCell = row.insertCell()

    numCell.addClass("skr-numcell")
    numCell.setText((i+1).toString())
    conCell.addClass("skr-concell")
    conCell.setText(lines[i])
    
    if (cb) {cb(i, {table: tab, row: row, num: numCell, con: conCell})} 
  }
  fieldEl.append(tab)
}

function makeField(containerEl: HTMLElement, name: string, wrap?: boolean, startCollapsed?: boolean) {
  let fieldContainer = createDiv({"cls": "skribi-modal-error-field-container"})
  let fieldTitle = (!wrap) ? fieldContainer.createDiv({text: name, cls: "skribi-modal-error-field-title"}) : null
  let fieldContent = fieldContainer.createDiv({cls: "skribi-modal-error-field-content"})

  containerEl.append(fieldContainer)

  var col
  if (wrap) {
    col = wrapCollapse(fieldContainer, startCollapsed)
    col.collapseTitleTextEl.setText(name)
  }

  return {
    container: fieldContainer,
    title: fieldTitle ?? col.collapseTitleTextEl,
    content: fieldContent,
    col: col ?? null
  }
}

function wrapCollapse(el: HTMLElement, startCollapsed?: boolean) {
  let oel = el
  let col = new Collapsible(el, startCollapsed)
  el.replaceWith(col.collapseEl)
  setIcon(col.collapseIndicator, "right-triangle")
  col.collapseContentEl.append(oel)
  return col
}

const CLS = {
	COLLAPSIBLE: "skr-collapsible",
	COLLAPSIBLE_TITLEBAR: "skr-collapsible-titlebar",
	COLLAPSIBLE_CONTENT: "skr-collapsible-content",
	COLLAPSIBLE_TITLETEXT: "skr-collapsible-titletext",
	COLLAPSIBLE_INDICATOR: "skr-collapse-indicator",
	COLLAPSIBLE_IS_COLLAPSED: "is-collapsed"
}

class Collapsible {
  collapseEl: HTMLDivElement;
  collapseTitleEl: HTMLElement;
  collapseContentEl: HTMLElement;
  collapseTitleTextEl: HTMLElement;
  collapseIndicator: HTMLSpanElement;
  
  constructor(el: HTMLElement, startCollapsed?: boolean) {
    this.collapseEl = createDiv({cls: CLS.COLLAPSIBLE})
    this.collapseTitleEl = this.collapseEl.createDiv({cls: CLS.COLLAPSIBLE_TITLEBAR})
    this.collapseContentEl = this.collapseEl.appendChild(createDiv({cls: CLS.COLLAPSIBLE_CONTENT}))		
  
    this.collapseTitleTextEl = this.collapseTitleEl.createSpan({cls: CLS.COLLAPSIBLE_TITLETEXT})
    this.collapseIndicator = createSpan({cls: CLS.COLLAPSIBLE_INDICATOR})
    this.collapseTitleEl.prepend(this.collapseIndicator)

    if (startCollapsed) {
      this.collapseEl.addClass(CLS.COLLAPSIBLE_IS_COLLAPSED);
      this.collapseContentEl.setAttribute("style", `max-height: 0px;`)
    }

    this.collapseTitleEl.addEventListener("click", (event: any) => {
    let b = this.collapseEl.hasClass(CLS.COLLAPSIBLE_IS_COLLAPSED)
    let h = b ? (el.clientHeight + (el.clientHeight * 0.2)) : 0
    this.collapseContentEl.setAttribute("style", `max-height: ${h}px;`);
    this.collapseEl.toggleClass(CLS.COLLAPSIBLE_IS_COLLAPSED, !b)
  })
  
    /* Calculate max height before first collapse */
    this.collapseTitleEl.addEventListener("mouseover", () => {
      if ((!this.collapseContentEl.hasAttribute("style")) )
        this.collapseContentEl.setAttribute("style", `max-height: ${el.clientHeight + (el.clientHeight * 0.2)}px;`)
    });
  }
}