import SkribosPlugin from "./main"

export class StyleManager {
  plugin: SkribosPlugin
  sheet: HTMLStyleElement

  ruleVars: Record<number, {style: string, time: number}>

  constructor(plugin: SkribosPlugin) {
    this.plugin = plugin
    this.sheet = createEl("style", {type: "text/css"})
    this.sheet.id = "skribi-dynamic"

    document.getElementsByTagName("head")[0].appendChild(this.sheet)

    this.ruleVars = {}
  }

  unload() {
    document.getElementsByTagName("head")[0].removeChild(this.sheet)
  }
  
  updateVariables() {

    let text = ((`
    ${ Object.entries(this.ruleVars).reduce((a, b) => {
      return a + `[sk-hash="${b[0]}"] { ${b[1].style} }`;
    }, "")}
  `).replace(/[\r\n\s]+/g, ""))

    this.sheet.innerText = text
  }

  setRule(hash: number, style: string | {style: string, time: number}) {
    console.log(`Skribi: setting style for #${hash}`, style)
    this.ruleVars[hash] = String.isString(style) ? {style: style, time: window.performance.now()} : style
    this.updateVariables()
  }

  deleteRule(hash: number) {
    console.log(`Skribi: clearing style for #${hash}`)
    delete this.ruleVars[hash];
    this.updateVariables()
  }
}