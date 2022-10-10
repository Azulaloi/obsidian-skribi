import { App, Modal, Setting } from "obsidian"
import { l } from "src/lang/babel";
import { kls, linkDocs } from "src/util/util";

interface confirmationModalValues {
  title: string
  labelPos: string
  labelNeg: string
  desc?: string
  class?: string
  elements?: Element[]
} 

/* A simple modal with a confirm/cancel feature. */
export class confirmationModal extends Modal {
  private resolve: (value: string) => void;
  private reject: (reason?: any) => void;

  private fields: confirmationModalValues = {
    title: l["modal.confirm.title"],
    labelPos: l["modal.confirm.confirm"],
    labelNeg: l["modal.confirm.cancel"],
  }

  constructor(app: App, fieldsIn?: Partial<confirmationModalValues>) {
    super(app)
    Object.assign(this.fields, fieldsIn || {})
  }

  onOpen(){
    this.titleEl.setText(this.fields.title)
    this.containerEl.addClass(kls('confirmation-modal'), this.fields.class)
    if (this.fields.desc) this.contentEl.createDiv({cls: kls('confirmation-modal-description'), text: this.fields.desc})
    this.contentEl.append(...this.fields?.elements ?? [])

    let c = this.contentEl.createDiv({cls: kls('confirm-modal-buttons')})
    c.createEl("button", {text: this.fields.labelPos, cls: kls('modal-button-confirm')}, (b) => {  
      b.onClickEvent(() => {
        this.resolve("true")
        this.close()
      }) 
    })

    c.createEl("button", {text: this.fields.labelNeg, cls: kls('modal-button-cancel')}, (b) => { 
      b.onClickEvent(() => {
        this.resolve("false")
        this.close() 
      })
    })
  }

  async openAndGetValue(resolve: (value: string) => void, reject: (reason?: any) => void): Promise<void> {
      this.resolve = resolve;
      this.reject = reject;
      this.open();
  }
}

/* Creates or modifies a link that will prompt for confirmation before opening the link. */
/* I hate when things open the browser without asking... */
export function makeExternalLink(linkIn: HTMLAnchorElement | string): HTMLAnchorElement {
	const link = String.isString(linkIn) ? createEl('a', {attr: {href: linkIn}}) : linkIn

  link.addEventListener('click', (ev) => {
    ev.preventDefault()

    let p = new confirmationModal(window.app, {
      title: l["modal.external.title"],
      desc: l["modal.external.desc"],
      labelPos: l["modal.external.label"],
      elements: [createDiv({cls: kls('confirmation-modal-link'), text: link.getAttr('href')})]
    });

    new Promise((resolve: (value: string) => void, reject: (reason?: any) => void) => p.openAndGetValue(resolve, reject))
    .then(res =>  {
      if (res === "true") {
        window.open(link.getAttr('href'))
      }
    })
  })

	return link
}

export function addDocsButton(el: HTMLElement, val: string): HTMLAnchorElement {
	return makeExternalLink(el.createEl('a', {
		text: "?",
		title: l['documentation.specific'],
		cls: 'skr-doc-link', 
		attr: {'href': linkDocs(val)}
	}))
}