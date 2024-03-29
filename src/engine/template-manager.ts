import * as Eta from "eta";
import { parseYaml, TAbstractFile, TFile } from "obsidian";
import SkribosPlugin from "src/main";
import { EBAR, VAR_NAME } from "src/types/const";
import {  getFiles, isExtant, isFile, isInFolder, makeSettingsLink, roundTo, vLog, vWarn, withoutKey } from "src/util/util";
import { Handler } from "./handler";
import { Cacher } from "./cacher";
import { FileMinder, TemplateCache, TemplateErrorCache } from "src/types/types";
import { compileWith } from "./compilation";
import compileToString from "./compilation-eta";
import { skInternalError } from "./error";

/** Responsible for management of templates and the template cache. */
export class TemplateLoader implements FileMinder {
  private handler: Handler
  private plugin: SkribosPlugin

  templateCache: Cacher<TemplateCache> = new Cacher<TemplateCache>({})
  templateFailures: Cacher<TemplateErrorCache> = new Cacher<TemplateErrorCache>({})
  styleCache: Cacher<string> = new Cacher<string>({})

  initError: any; // Stores errors thrown during loader init, to show error on await-regents

  constructor(handler: Handler) {
    this.handler = handler
    this.plugin = handler.plugin
  }

  public async init(): Promise<any> {
    return this.initLoad().catch((err) => {
      console.error("Skribi: TemplateLoader failed to initalize", EBAR, err);
      this.initError = err
      this.resetChildren()
    })
  }

  private async initLoad() {
    await this.reload().catch((e) => Promise.reject(e))
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
      // console.log(`reading ${file.name}`, isExtant(read))

      let fileFrontmatter = null
      if (file.extension == "eta") {
        let fmSearch = (/^---\n*(?<frontmatter>.*?)\n*---/s).exec(read);
        if (fmSearch?.groups?.frontmatter) {
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
        let compiledString = compileToString(read, Eta.getConfig({varName: VAR_NAME, name: file.basename}))
        // console.log(`compiling ${file.name} to string`)
        var compiled = compileWith(compiledString, [VAR_NAME, 'E', 'cb', ...scopeKeys], (read.contains('await')))
        // console.log(`compiled ${file.name} as template`)
      } catch(err) {
        // console.log(`${file.name} err`)
        this.templateFailures.define(file.basename, {error: err, source: read, extension: file.extension})
        vWarn(`Skribi: template '${file.basename}' failed to compile, the template index may contain more details`, EBAR, err, EBAR, read)
        this.templateCache.remove(file.basename)
        failureCount++
        return Promise.reject()
      }
  
      this.templateFailures.remove(file.basename)
      this.templateCache.define(file.basename, {
        source: read,
        function: compiled,
        frontmatter: fileFrontmatter ? withoutKey(fileFrontmatter, 'position') : null,
        extension: file.extension
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

      if ((styleFiles.length > 0) || (templateFiles.length > 0)) {
        this.plugin.app.workspace.trigger('skribi:template-index-modified')
      }
    }

    return Promise.resolve()
  }

  /** Deletes cached entries by string name or file of origin. */
  private deletePartial(...items: Array<TFile | string>): void {
    this.deletePartialByName(...items.map(i => isFile(i) ? i.name : i))
  }

  /** Deletes cached templates by string name. */
  private deletePartialByName(...items: Array<string>): void {
    for (let item of items) {
      let split = (/(?<name>[^]+)\.(?<extension>[^]+)$/g).exec(item)
      if (!(Object.keys(split?.groups)?.length ?? 0 > 0)) {
        console.warn('Skribi: TemplateLoader.deletePartialByName() could not parse name \n', item)
        continue
      }

      if (split.groups['extension'] == "css") {
        this.styleCache.remove(split.groups['name'])
        Array.from(this.plugin.children).forEach((child) => {
          child.stylesUpdated(split.groups['name'])
        })
      } else {
        this.templateCache.remove(split.groups['name'])
        Array.from(this.plugin.children).forEach((child) => {
          child.templatesUpdated(split.groups['name'])
        })
      }
    }
  }

  /** Reloads the template loader, recompiling all templates. */
  public async reload(): Promise<any> {
    this.initError = null;

    if (this.directory.length <= 0) {
      // new Notice("Skribi: template directory not defined!"); 
      throw skInternalError({ 
        name: "TemplateLoader", message: "Template directory not defined!", err: null, 
        regentClass: "skr-waiting skr-template-init-error", 
        el: makeSettingsLink(createDiv({cls: ['skribi-modal-error-message']}))
      })
    }

    var files = null;
    try { files = getFiles(this.plugin.app, this.directory) } 
    catch (err) { 
      throw skInternalError({
        name: "TemplateLoader", message: err?.message, err: err, 
        regentClass: "skr-waiting skr-template-init-error", 
        el: makeSettingsLink(createDiv({cls: ['skribi-modal-error-message']}))
      })
    }

    this.templateCache.reset()
    await this.definePartials(...files)
    
    return Promise.resolve("") 
  }

  /** Resets all live skribi children. */
  private resetChildren(): void {
    Array.from(this.plugin.children).forEach((child) => {
      if (child?.templateKey) {
        child.reset() 
      } 
    })
  }

  /* FileMinder Functions */
  
  get directory(): string { return this.plugin.settings.templateFolder }

  fileUpdated(file: TAbstractFile): void {
    if (!isFile(file)) return;
    vLog(`File '${file.name}' in template directory modified, updating...`)
    this.definePartials(file)
  }

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

  async directoryChanged() {
    vLog(`Template directory changed, reloading templates...`)
    this.templateCache.reset()
    this.templateFailures.reset()
    this.styleCache.reset()
    
    var r
    try {
      r = await this.reload()
    } catch(err) {
      this.initError = err
    } finally {
      if (isExtant(r)) {this.plugin.app.workspace.trigger("skribi:template-init-complete")}
      this.resetChildren()
    }
  }

  isInDomain(file: TAbstractFile): boolean {
    return isInFolder(file, this.directory)
  }
}
