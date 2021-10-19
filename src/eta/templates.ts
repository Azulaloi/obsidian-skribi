import * as Eta from "eta";
import { FrontMatterCache, parseYaml, TAbstractFile, TFile } from "obsidian";
import SkribosPlugin from "src/main";
import { EBAR, VAR_NAME } from "src/types/const";
import {  getFiles, isExtant, isFile, isInFolder, roundTo, vLog, vWarn, withoutKey } from "src/util";
import { EtaHandler } from "./eta";
import { Cacher } from "./cacher";
import { FileMinder, Stringdex, TemplateFunctionScoped } from "src/types/types";
import { compileWith } from "./comp";

export interface TemplateCache {
  source?: string,
  function: TemplateFunctionScoped,
  frontmatter?: Stringdex
}

/* Responsible for the caching and management of templates. */
// TODO: add system to auto-reload skribis when relevant template cache changes 
export class TemplateLoader implements FileMinder {
  private handler: EtaHandler
  private plugin: SkribosPlugin

  templateCache: Cacher<TemplateCache> = new Cacher<TemplateCache>({})
  templateFailures: Map<string, string> = new Map();
  styleCache: Cacher<string> = new Cacher<string>({})

  constructor(handler: EtaHandler) {
    this.handler = handler
    this.plugin = handler.plugin
  }

  public async init(): Promise<any> {
    return this.initLoad()
  }

  private async initLoad() {
    await this.definePartials(...getFiles(this.plugin.app, this.directory)) 
    this.plugin.app.workspace.trigger('skribi:template-init-complete')
    return Promise.resolve()
  }

  /** 
   * Reads passed files and attempts to cache them.
   * Handles templates and styles. Templates are compiled to functions. */
  private async definePartials(...files: TFile[]): Promise<void> {
    const startTime = window.performance.now()
    var failureCount = 0
    var successCount = 0

    const scopeKeys = this.handler.bus.getScopeKeys()

    let styleFiles: TFile[] = []
    let templateFiles: TFile[] = [] 
    files.forEach(file => {
      switch(file.extension) {
        case "md": templateFiles.push(file); break;
        case "eta": templateFiles.push(file); break;
        case "css": styleFiles.push(file); break;
        default: break;
      }
    })

    const readTemplates = templateFiles.map(async file => {
      let read = await this.plugin.app.vault.cachedRead(file)

      let fileFrontmatter = null
      if (file.extension == "eta") {
        let fmSearch = (/^---\n*(?<frontmatter>.*?)\n*---/s).exec(read);
        if (fmSearch.groups.frontmatter) {
          try {
            let yaml = parseYaml(fmSearch.groups.frontmatter.trim())
            fileFrontmatter = yaml
            read = read.substr(fmSearch[0].length)
          } catch (e) {
            vWarn(`Error parsing frontmatter of ${file.name}, please report.`, EBAR, e)
          }
        }
      } else {
        /* Markdown files can check for cached frontmatter which is maybe faster */
        fileFrontmatter = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter
        if (fileFrontmatter) {
          let fmSearch = (/(?<frontmatter>^---.*?(?=\n---)\n---)/s).exec(read);
          let fmText = fmSearch?.groups?.frontmatter ?? null
          if (isExtant(fmText)) { read = read.substr(fmText.length)}      
        }
      }
      
      try {
        let compiledString = Eta.compileToString(read, Eta.getConfig({varName: VAR_NAME, name: file.basename}))
        var compiled = compileWith(compiledString, [VAR_NAME, 'E', 'cb', ...scopeKeys], (read.contains('await')))
      } catch(err) {
        this.templateFailures.set(file.basename, err || `Template failed to compile: Unknown Error`)
        console.warn(`Skribi: template '${file.basename}' failed to compile`, EBAR, err, EBAR, read)
        this.templateCache.remove(file.basename)
        failureCount++
        return Promise.reject()
      }
  
      this.templateFailures.delete(file.basename)
      this.templateCache.define(file.basename, {
        'source': read,
        'function': compiled,
        'frontmatter': fileFrontmatter ? withoutKey(fileFrontmatter, 'position') : null
      })
      successCount++

      return Promise.resolve()
    })

    const readStyles = styleFiles.map(async file => {
      let read = await this.plugin.app.vault.cachedRead(file)
      this.styleCache.define(file.basename, read)
    })

    await Promise.allSettled(readTemplates.concat(readStyles))

    if ((!this.plugin.initLoaded) && files.length) {
      let str = `${successCount} template${(successCount == 1) ? '' : 's'}`
      if (failureCount) str += `\n Of ${templateFiles.length} total templates, ${failureCount} failed to compile.`
      console.log(`Skribi: Loaded ` + str)
    } else if (this.plugin.initLoaded) {
      /* Other than during init, definePartials is called on single files at a time.  */

      if (templateFiles.length > 0) {
        Array.from(this.plugin.children).forEach((child) => {
          child.templatesUpdated(templateFiles[0].basename)
        })
        vLog(`Updated template '${templateFiles[0].basename}' in ${roundTo(window.performance.now() - startTime, 4)}ms`)
      }

      if (styleFiles.length > 0) {
        Array.from(this.plugin.children).forEach((child) => {
          child.stylesUpdated(styleFiles[0].basename)
        })
        vLog(`Update style '${styleFiles[0].basename}'`)
      }
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

  deletePartialByName(...items: Array<string>) {
    for (let item of items) {
      let split = (/(?<name>[^]+)\.(?<extension>[^]+)$/g).exec(item)
      if (!(Object.keys(split?.groups)?.length ?? 0 > 0)) {
        console.warn('Skribi: TemplateLoader.deletePartialByName() could not parse name \n', item)
        continue
      }

      ((split.groups['extension'] == "css") ? this.styleCache : this.templateCache)
      .remove(split.groups['name'])
    }
  }

  public async reload(): Promise<void> {
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

  // fileDeleted(file: TAbstractFile | string): void { // never actually called as string I just wrote it to handle it for some reason
  //   let isf = isFile(file)
  //   if ((!isf && !(String.isString(file) && this.templateCache.get(file)))) return;
  //   vLog(`File '${isf ? (file as TFile).name : file}' removed from template directory, unloading...`)
  //   this.deletePartial(file as (TFile | string))
  // }

  fileDeleted(file: TAbstractFile): void {
    if (!isFile(file)) return;
    vLog(`File '${file.name}' removed from template directory, unloading...`)
    this.deletePartialByName(file.name)
  }

  fileAdded(file: TAbstractFile): void {
    if (!isFile(file)) return;
    vLog(`File '${file.name}' added to template directory, loading...`)
    this.definePartials(file)
  }

  fileRenamed(file: TAbstractFile, oldName: string): void {
    if (!isFile(file)) return;
    vLog(`Template file '${oldName}' renamed to '${file.name}', updating...`)

    this.deletePartialByName(oldName)
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