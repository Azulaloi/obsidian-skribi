import * as Eta from "eta";
import { FrontMatterCache, TAbstractFile, TFile } from "obsidian";
import SkribosPlugin from "src/main";
import { EBAR, VAR_NAME } from "src/types/const";
import { checkFileExt, getFiles, isExtant, isFile, isInFolder, roundTo, vLog, withoutKey } from "src/util";
import { EtaHandler } from "./eta";
import { Cacher } from "./cacher";
import { FileMinder, TemplateFunctionScoped } from "src/types/types";
import { compileWith } from "./comp";

/* Responsible for the caching and management of templates. */
export class TemplateLoader implements FileMinder {
  private handler: EtaHandler
  private plugin: SkribosPlugin

  templateCache: Cacher<TemplateFunctionScoped> = new Cacher<TemplateFunctionScoped>({})
  templateFailures: Map<string, string> = new Map();
  templateFrontmatters: Map<string, FrontMatterCache> = new Map();


  constructor(handler: EtaHandler) {
    this.handler = handler
    this.plugin = handler.plugin
  }

  async init(): Promise<any> {
    return this.initLoad()
  }

  async initLoad() {
    await this.definePartials(...getFiles(this.plugin.app, this.directory)) 
    this.plugin.loadEvents.trigger('init-load-complete') //TODO: use native events?

    return Promise.resolve()
  }

  /* Load and compile files into the template cache */
  async definePartials(...files: TFile[]): Promise<void> {
    const startTime = window.performance.now()
    var failureCount = 0
    var successCount = 0

    const scopeKeys = this.handler.bus.getScopeKeys()

    const readPromises = files.map(async file => {
      if (!checkFileExt(file, ["md", "eta", "txt"])) return Promise.reject();

      let read = await this.plugin.app.vault.cachedRead(file)

      let fileFrontmatter = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter
      if (fileFrontmatter) {
        let fmSearch = (/(?<frontmatter>^---.*?(?=\n---)\n---)/s).exec(read);
        let fmText = fmSearch?.groups?.frontmatter ?? null
        if (isExtant(fmText)) { read = read.substr(fmText.length)}      
      }

      try {
        let compiledString = Eta.compileToString(read, Eta.getConfig({varName: VAR_NAME, name: file.basename}))
        var compiled = compileWith(compiledString, [VAR_NAME, 'E', 'cb', ...scopeKeys], (read.contains('await')))
      } catch(err) {
        this.templateFailures.set(file.basename, err || `Template failed to compile: Unknown Error`)
        console.warn(`Skribi: template '${file.basename}' failed to compile`, EBAR, err, EBAR, read)
        this.templateCache.remove(file.basename)
        this.templateFrontmatters.delete(file.basename)
        failureCount++
        return Promise.reject()
      }

      this.templateFailures.delete(file.basename)
      this.templateCache.define(file.basename, compiled)
      if (fileFrontmatter) this.templateFrontmatters.set(file.basename, withoutKey(fileFrontmatter, 'position') as FrontMatterCache)
      successCount++

      return Promise.resolve()
    })

    await Promise.allSettled(readPromises)

    if ((!this.plugin.initLoaded) && files.length) {
      let str = `${successCount} template${(successCount == 1) ? '' : 's'}`
      if (failureCount) str += `\n Of ${files.length} total templates, ${failureCount} failed to compile.`
      console.log(`Skribi: Loaded ` + str)
    } else if (this.plugin.initLoaded) {
      vLog(`Updated template '${files[0].basename}' in ${roundTo(window.performance.now() - startTime, 4)}ms`)
    }

    return Promise.resolve()
  }

  /* Deletes cache entries by string name or file of origin */
  deletePartial(...items: Array<TFile | string>): void {
    for (let item of items) {
      let name = isFile(item) ? item.basename : item
      this.templateCache.remove(name)
    }
  }

  async reload(): Promise<void> {
    this.templateCache.reset()
    return this.definePartials(...getFiles(this.plugin.app, this.directory))
  }

  /* FileMinder Functions */
  
  get directory(): string { return this.plugin.settings.templateFolder }

  fileUpdated(file: TAbstractFile): void {
    if (!isFile(file)) return;
    vLog(`File '${file.name}' in template directory modified, updating...`)
    this.definePartials(file)
  }

  fileDeleted(file: TAbstractFile | string): void {
    let isf = isFile(file)
    if ((!isf && !(String.isString(file) && this.templateCache.get(file)))) return;
    vLog(`File '${isf ? (file as TFile).name : file}' removed from template directory, unloading...`)
    this.deletePartial(file as (TFile | string))
  }

  fileAdded(file: TAbstractFile): void {
    if (!isFile(file)) return;
    vLog(`File '${file.name}' added to template directory, loading...`)
    this.definePartials(file)
  }

  fileRenamed(file: TAbstractFile, oldName: string): void {
    if (!isFile(file)) return;
    vLog(`Template file '${oldName}' renamed to '${file.name}', updating...`)
    this.deletePartial(oldName)
    this.definePartials(file)
  }

  directoryChanged(): void {
    vLog(`Template directory changed, reloading templates...`)
    this.reload()
  }

  isInDomain(file: TAbstractFile): boolean {
    return isInFolder(file, this.directory)
  }
}