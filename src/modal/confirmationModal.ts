import { App, Modal } from "obsidian"
import { kls } from "src/util";

interface confirmationModalValues {
  title: string
  labelPos: string
  labelNeg: string
  desc?: string
  class?: string
  elements?: Element[]
} 

export class confirmationModal extends Modal {
  private resolve: (value: string) => void;
  private reject: (reason?: any) => void;

  private fields: confirmationModalValues = {
    title: "Please Confirm",
    labelPos: "Confirm",
    labelNeg: "Cancel",
  }

  constructor(app: App, fieldsIn?: Partial<confirmationModalValues>) {
    super(app)
    Object.assign(this.fields, fieldsIn || {})
  }

  onOpen(){
    this.titleEl.setText(this.fields.title)
    this.containerEl.addClazz(kls('confirmation-modal'), this.fields.class)
    if (this.fields.desc) this.contentEl.createDiv({cls: kls('confirmation-modal-description'), text: this.fields.desc})
    this.contentEl.append(...this.fields.elements)

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