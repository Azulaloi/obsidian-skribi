import { setIcon } from "obsidian"
import { IndexTemplateModal } from "src/modal/modal-index-template"
import { isExtant } from "./util"

/** Context for the `makeLinesTable()` callback function used by `makeLinesAndPoint()` */
export interface linesTableCB {
  table: HTMLTableElement, row: HTMLTableRowElement, 
  num: HTMLTableCellElement, con: HTMLTableCellElement
}

/** Creates a table to display text with numbered lines. Used mostly in error displays.
 * @param fieldEl if present, table will be appended to this element
 * @param linesIn lines to display, can be array or will split by newlines
 * @param cb callback called for every line, used by `makeLinesAndPoint()` */
export function makeLinesTable(fieldEl?: HTMLElement, linesIn?: string | string[],
  cb?: (ind: number, els: linesTableCB) => any): void | HTMLElement
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
  if (isExtant(fieldEl)) {fieldEl.append(tab)} 
  return tab
}

/** Pretty sure this is outmoded by `makeLinesTable()`
 * TODO: test why that one line in error-modal.ts still uses this function instead of table */
export function makeLines(fieldEl: HTMLElement, linesIn: string | string[], 
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

/** Creates a collapsible field. */
export function makeField(modalName: string, containerEl: HTMLElement, name: string, wrap?: boolean, startCollapsed?: boolean, cb?: (state: boolean) => any) {
  let fieldContainer = createDiv({"cls": `skribi-modal-${modalName}-field-container`})
  let fieldTitle = (!wrap) ? fieldContainer.createDiv({text: name, cls: `skribi-modal-${modalName}-field-title`}) : null
  let fieldContent = fieldContainer.createDiv({cls: `skribi-modal-${modalName}-field-content`})

  containerEl.append(fieldContainer)

  var col
  if (wrap) {
    col = wrapCollapse(fieldContainer, startCollapsed, cb)
    col.collapseTitleTextEl.setText(name)
  }

  return {
    container: fieldContainer,
    title: fieldTitle ?? col.collapseTitleTextEl,
    content: fieldContent,
    col: col ?? null
  }
}

/** Wraps an element in a new collapsible element, in place. */
export function wrapCollapse(el: HTMLElement, startCollapsed?: boolean, cb?: (state: boolean) => any) {
  let oel = el
  let col = new Collapsible(el, startCollapsed, cb)
  el.replaceWith(col.collapseEl)
  setIcon(col.collapseIndicator, "right-triangle")
  col.collapseContentEl.append(oel)
  return col
}

export const COL_CLS = {
	COLLAPSIBLE: "skr-collapsible",
	COLLAPSIBLE_TITLEBAR: "skr-collapsible-titlebar",
	COLLAPSIBLE_CONTENT: "skr-collapsible-content",
	COLLAPSIBLE_TITLETEXT: "skr-collapsible-titletext",
	COLLAPSIBLE_INDICATOR: "skr-collapse-indicator",
	COLLAPSIBLE_IS_COLLAPSED: "is-collapsed"
}

/** A collapsible widget. */
export class Collapsible {
  collapseEl: HTMLDivElement;
  collapseTitleEl: HTMLElement;
  collapseContentEl: HTMLElement;
  collapseTitleTextEl: HTMLElement;
  collapseIndicator: HTMLSpanElement;
  updateSize: () => void;
  
  constructor(el: HTMLElement, startCollapsed?: boolean, cb?: (state: boolean) => any) {
    this.collapseEl = createDiv({cls: COL_CLS.COLLAPSIBLE})
    this.collapseTitleEl = this.collapseEl.createDiv({cls: COL_CLS.COLLAPSIBLE_TITLEBAR})
    this.collapseContentEl = this.collapseEl.appendChild(createDiv({cls: COL_CLS.COLLAPSIBLE_CONTENT}))		
  
    this.collapseTitleTextEl = this.collapseTitleEl.createSpan({cls: COL_CLS.COLLAPSIBLE_TITLETEXT})
    this.collapseIndicator = createSpan({cls: COL_CLS.COLLAPSIBLE_INDICATOR})
    this.collapseTitleEl.prepend(this.collapseIndicator)

    if (startCollapsed) {
      this.collapseEl.addClass(COL_CLS.COLLAPSIBLE_IS_COLLAPSED);
      this.collapseContentEl.setAttribute("style", `max-height: 0px;`)
    }

    this.collapseTitleEl.addEventListener("click", (event: MouseEvent) => {
      let t = event.target as HTMLElement
      if (!((t.nodeName === "BUTTON") || (t.nodeName === "A"))) {
        let b = this.collapseEl.hasClass(COL_CLS.COLLAPSIBLE_IS_COLLAPSED)
        let h = b ? (el.clientHeight + (el.clientHeight * 0.2)) : 0
        this.collapseContentEl.setAttribute("style", `max-height: ${h}px;`);
        this.collapseEl.toggleClass(COL_CLS.COLLAPSIBLE_IS_COLLAPSED, !b)
        if (cb) cb(this.collapseEl.hasClass(COL_CLS.COLLAPSIBLE_IS_COLLAPSED))
      }
    })
  
    this.updateSize = () => {
      this.collapseContentEl.setAttribute("style", `max-height: ${el.clientHeight + (el.clientHeight * 0.2)}px;`)
    }

    /* Calculate max height before first collapse */
    this.collapseTitleEl.addEventListener("mouseover", () => {
      if (!this.collapseContentEl.hasAttribute("style")) this.updateSize()
    }); 
  }
}
