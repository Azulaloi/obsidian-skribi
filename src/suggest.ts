import { AbstractTextComponent, Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, PopoverSuggest, Scope, TextAreaComponent, TFile } from "obsidian";
import SkribosPlugin from "./main";
import { isExtant } from "./util/util";

// TODO: Don't suggest properties that have already been defined

/** Suggests templates and properties when invoking a template. */
export default class TemplateSuggest extends EditorSuggest<string> {
  private plugin: SkribosPlugin

  constructor(plugin: SkribosPlugin) {
    super(plugin.app)
    this.plugin = plugin
  }
  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo {
    if (this.plugin.settings.templateSuggest) {
      let soFar = editor.getLine(cursor.line).substr(0, cursor.ch)
      let match = (/^.*`{:([^}]*)$/gs).exec(soFar)
      // console.log(match)
      if (match?.[0]) {
        let m = match[1].match(/\|([^\|]*)$/)
        // console.log("m", m)
        return {
          end: cursor,
          start: {
            ch: isExtant(m?.[1]) ? (cursor.ch - m[1].length) : (match[0].length - (match[1]?.length ?? 0)), //match[1].match(/[^\|]*$/), //,
            line: cursor.line
          },
          query: match?.[1] ?? ""
        }
      } 
    }
  }

  getSuggestions(context: EditorSuggestContext): string[] | Promise<string[]> {
    let has = context.query.match(/^(.*)\|([^\:]*$)/s)
    // console.log(has)
    if (has) {
      let ind = context.query.indexOf("|")
      let key = context.query.substr(0, ind).trim()
      let tp = this.plugin.handler.templates.get(key)
      if (tp?.frontmatter) {
        let pk = has?.[2]?.trim()
        // console.log(pk)
        return Object.keys(tp.frontmatter)
        .filter(k => (k.substr(1).startsWith(has?.[2]?.trimStart()) && !(k.substring(1).trim() == has?.[2].trim())))
        .map((v) => v.substr(1))
      }
    } else {
      let keys = this.plugin.handler.getCacheKeys()
      // console.log('query:', context?.query)
      let ret = context?.query ? keys.filter(key => (key.startsWith(context.query) && !(key == context.query))) : keys
      // console.log(ret)
      return ret
    }
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.addClass("skribi-suggestion")
    el.createSpan({text: value})
  }

  selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
    if (this.context) {

      // let conLength = this.context.end.ch - this.context.start.ch
      // let preLength = conLength - (this.context.query.length + 3)
      let line = this.context.editor.getLine(this.context.start.line)
      let bar = line.match(/^.*(\`\{\:([^\|]*\|)*)/s)
      
      // console.log('bar\n', bar)
      // console.log('query\n', this.context.query)
      // console.log('pre\n', line.substr(preLength, preLength + bar?.[0].length))
      // console.log('line\n', line)
      let ch = ((bar && bar?.[0]) ? bar[0].length : null) ?? this.context.start.ch
      // console.log(line.charAt(ch-1))
      this.context.editor.replaceRange(((line.charAt(ch-1) == ":") ? "" : " ") + value, {
        line: this.context.start.line,
        ch: ch
      }, this.context.end)
    }
  }
}

/** A non-editor suggestor that suggests template keys. Used in the preset list in the settings tab. */
export class TemplateSuggestAlt extends PopoverSuggest<string> {
  private readonly plugin: SkribosPlugin
  private readonly textComponent: AbstractTextComponent<HTMLTextAreaElement>
  private readonly inputEl: HTMLTextAreaElement
  private readonly cb: (val: string, text: TextAreaComponent) => void

  constructor(
    plugin: SkribosPlugin, 
    textComponent: AbstractTextComponent<HTMLTextAreaElement>, 
    cb: (val: string, text: TextAreaComponent) => void, 
    scope?: Scope
  ) {
    super(plugin.app, scope)
    this.plugin = plugin
    this.textComponent = textComponent
    this.inputEl = textComponent.inputEl
    this.cb = cb

		this.inputEl.addEventListener('focus', e => {
			this.display()
		})

    this.inputEl.addEventListener('blur', e => {
      this.undisplay()
    })

    this.inputEl.addEventListener('input', e => {
      if (!this.isOpen) this.display();
      this.updateSuggestions(this.inputEl.value)
		})
  }
  
  display(): void {
    let rect = this.inputEl.getBoundingClientRect()
    this.suggestEl.style.width = rect.width + "px" 
    this.suggestEl.style.display = "block"
    this.reposition(rect)
    this.open()
    this.updateSuggestions(this.inputEl.value)
  }

  undisplay(): void {
    this.suggestEl.style.display = "none"
    this.close()
  }

  updateSuggestions(value: string) {
    let keys = this.plugin.handler.getCacheKeys()
    let res = keys.filter((v, i , a) => {
      return v.startsWith(value) && (v != value)
    })
    this.suggestions.setSuggestions(res)
    if (res.length == 0) {this.undisplay()}
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.createSpan({text: value})
  }

  selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
    this.textComponent.setValue(value)
    this.cb(value, this.textComponent)
    this.undisplay()
  }
}