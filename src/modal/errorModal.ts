import { match } from "assert";
import { Modal, App, setIcon } from "obsidian";
import { SkribiError, SkribiSyntaxError, SkribiEvalError } from "src/eta/error";
import { isExtant } from "src/util";


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
    this.containerEl.addClass("skribi-modal-error")

    if (err instanceof SkribiError) {
      this.titleEl.innerText = "SkribiError: " + err.message

      if (err instanceof SkribiSyntaxError) {
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
  
        let srcField = makeField(this.contentEl, "Invocation String")
        makeLines(srcField.content, err._sk_invocation.split(/\r\n|\n/))
  
        if (err?._sk_template) {
          let tempField = makeField(this.contentEl, "Template Source")
          makeLines(tempField.content, err._sk_template.split(/\r\n|\n/))
        }

        // console.log(util.inspect(err, true, 7, true))
      } else if (err instanceof SkribiEvalError) {
        // console.log(Object.getPrototypeOf(err))
        // console.log(util.inspect(err, true, 7, true))
        // console.log(err.evalError.name)
  
        let subErrorMessage = this.contentEl.createDiv({cls: 'skribi-modal-error-message'})
        subErrorMessage.createSpan({text: err.evalError.name + ": ", cls: 'sk-label'})
        subErrorMessage.createSpan({text: err.evalError.message, cls: 'sk-msg'})

        // let errField = makeField(this.contentEl, err.evalError.name + ": " + err.evalError.message)
        // errField.content.setText(err.evalError.stack)

        var match: any;
        if (err.evalError instanceof TypeError) {
          // at Object.eval (eval at compileWith (eval at <anonymous> (app://obsidian.md/app.js:1:1287967)), <anonymous>:6:8)
          // let match = err.evalError.stack.match(/(at Object.eval \(\))/)
          // let match = err.evalError.stack.match(/at Object.eval \([^\n]*,(?: \<[^\:]*\:(?<line>\d*)\:(?<ch>\d*))\)\n/)
          match = (/at Object.eval \([^\n]*,(?: \<[^\:]*\:(?<line>\d*)\:(?<ch>\d*))\)\n/).exec(err.evalError.stack)
          console.log(match)
        }
  
        let compField = makeField(this.contentEl, "Compiled Function", true, false)
        let lines = err._sk_function.toString().split(/\r\n|\n/)
        // lines[0] = lines[0] + lines[1]
        let unrelated = [0, 1, 2, 3, 4, lines.length-1, lines.length-2, lines.length-3]
        /*makeLines(compField.content, lines, isExtant(match) ? 
        (ind: number, els: any) => {
          if (unrelated.contains(ind)) {
            els.lineEl.addClass('skribi-line-extraneous')
          }
  
          if (ind == match.groups.line-1) {
            els.lineEl.addClass('skribi-line-errored')
            let pstr = "^".padStart(match.groups.ch)
            let lineEl = createDiv({cls: "skribi-modal-error-field-line skerr-pointer"})
            lineEl.createDiv({text: "@", cls: "skribi-line-number skerr-pointer"})
            lineEl.createDiv({text: pstr, cls: "skribi-line-content skerr-pointer"})
            compField.content.append(lineEl)
          }
        }: undefined)*/
        makeLinesTable(compField.content, lines, (ind: number, els: linesTableCB) => {
          if (unrelated.contains(ind)) {
            els.row.addClass('skribi-line-extraneous')
          }

          if (ind == match.groups.line-1) {
            els.row.addClass('skribi-line-errored')
            let pstr = "^".padStart(match.groups.ch)
            let row = els.table.insertRow()
            let numCell = row.insertCell()
            numCell.setText("@")
            numCell.addClass("skr-numcell", "skr-pointer")
            let conCell = row.insertCell()
            conCell.setText(pstr)
            conCell.addClass("skr-concell", "skr-pointer")
          }
        })

        let invField = makeField(this.contentEl, "Invocation String", true)
        makeLines(invField.content, err._sk_invocation)

        if (err?._sk_template) {
          let tempField = makeField(this.contentEl, "Template Source", true)
          makeLines(tempField.content, err._sk_template)
        }

        let subErrField = makeField(this.contentEl, err.evalError.name + " Stack", true, true)
        makeLines(subErrField.content, err.evalError.stack)

        let errField = makeField(this.contentEl, err.name + " Stack", true, true)
        makeLines(errField.content, err.evalError.stack)
      }
    } else {
      console.log(Object.getPrototypeOf(err))
      console.log(err.msg)
      console.log(util.inspect(err, true, 7, true))

      let errField = makeField(this.contentEl, (err?.name ?? "Error") + ": " + (err?.msg ?? err?.message ?? "Unknown Error"), )
      errField.content.setText(err.stack)

      if (err?.skCon) {
        util.inspect(err.skCon)
        let compField = makeField(this.contentEl, "Compiled Function")
        compField.content.setText(err.skCon)
      }

      let srcField = makeField(this.contentEl, "Source String")
      makeLines(srcField.content, err.skSrc)
    }

    // var util = require('util')
    // console.log(util.inspect(this.error, true, 7, true))
    // console.log(Object.getPrototypeOf(this.error) == SkribiSyntaxError.prototype)

    // if (String.isString(this?.error)) 
    // errorField.innerText = this.error?.msg?.stack ?? this.error
    // console.log(this.error)

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