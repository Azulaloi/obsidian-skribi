import { FileSystemAdapter, TAbstractFile, TFile } from "obsidian";
import { DynamicState, FileMinder, Stringdex } from "src/types/types";
import { dLog, filterFileExt, getFiles, isExtant, isFile, isInFolder, vLog, withoutKey } from "src/util/util";
import { Provider } from "../provider_abs";

/* Loads and provides JS files from the skript directory as modules. */
export class ProviderScriptloader extends Provider implements FileMinder {
  loadedModules: Map<string, {name?: string, properties: Stringdex}> = new Map()

  async init() {
    return this.initLoad().then(() => super.init())
  }

  async initLoad() {
    return this.loadAndSet(...getFiles(this.bus.plugin.app, this.bus.plugin.settings.scriptFolder))
  }

  async loadAndSet(...file: TFile[]) {
    return this.readFiles(...file)
    .then((ret) => {/*vLog('Loading JS modules...', ret);*/ this.stashModule(ret); return Promise.resolve()});
  }

  stashModule(modules: [string, Stringdex][]) {
    dLog('Scriptloader: stashModule', modules)

    modules.forEach((r) => {
      if (r) {
        this.loadedModules.delete(r[0])
        this.loadedModules.set(r[0], {
          name: (String.isString(r[1]?._name ?? null) ? r[1]._name : null), 
          properties: withoutKey(r[1], '_name')
          }          
        )
      }
    })
  }

  createObject(ctx?: DynamicState): Stringdex {
    let exports = {}
    this.loadedModules.forEach((value, key) => {
      let single = (Object.keys(value.properties).length == 1) 

      let exKey = (value.name ?? (single ? Object.keys(value.properties)[0] : key))
      let exVal = single ? Object.values(value.properties)[0] : value.properties
      
      Object.defineProperty(exports, exKey, {
        get: function() {
          if (ctx) ctx?.child.sources.scripts.push(key);
          return exVal
        }
      })
    })

    return exports
  }

  async readFiles(...files: TFile[]): Promise<[string, Stringdex][]> {
    let filtered = filterFileExt(files, "js")
    const reads = filtered.map(async (f) => {
      try {
        if (!(this.bus.plugin.app.vault.adapter instanceof FileSystemAdapter)) return Promise.reject();
        let path = this.bus.plugin.app.vault.adapter.getBasePath() + "/" + f.path
        
        let resPath = window.require.resolve(path)
        if (Object.keys(window.require.cache).contains(resPath)) delete window.require.cache[window.require.resolve(resPath)]

        const mod = require(path)

        return (isExtant(mod)) 
          ? Promise.resolve([f.basename, mod])
          : Promise.reject()
      } catch(e) {
        console.warn(e)
        return Promise.reject()
      }      
    })

    return await Promise.allSettled(reads)
    .then((settled) => { return settled
      .filter((r) => {return r.status == "fulfilled"})
      .map((v) => {return (v as PromiseFulfilledResult<[string, Stringdex]>).value})
    })
  }

  clearJS(...items: Array<TFile | string>): void {
    let names = items.map((item) => {
      if (isFile(item)) return filterFileExt(item, 'js')[0].basename
      else if (String.isString(item)) return item 
    })

    for (let name of names) this.loadedModules.delete(name)
  }

  async reload(): Promise<void> {
    this.loadedModules.clear()
    await this.initLoad()
    return super.reload()
  }

  postDirty(id?: string) {
    Array.from(this.bus.plugin.children).forEach(child => child.scriptsUpdated(id))
  }

  /* FileMinder Functions */

  get directory(): string { return this.bus.plugin.settings.scriptFolder }

  fileUpdated(file: TAbstractFile): void {
    if (!isFile(file)) return;
    vLog(`File '${file.name}' in script directory modified, updating...`)
    this.clearJS(file)
    this.loadAndSet(file)
    .then(() => {this.setDirty(null, file.basename)}, () => this.clearJS(file))
  }

  fileDeleted(file: TAbstractFile): void {
    if (!isFile(file)) return;
    vLog(`File '${file.name}' removed from script directory, unloading...`)
    this.clearJS(file)
    this.setDirty(null, file.basename)
  }

  fileAdded(file: TAbstractFile): void {
    if (!isFile(file)) return;
    vLog(`File '${file.name}' added to script directory, loading...`)
    this.loadAndSet(file)
    .then(() => {this.setDirty()}, () => this.clearJS(file))
  }

  fileRenamed(file: TAbstractFile, oldName: string): void {
    if (!isFile(file)) return;
    vLog(`Script file '${oldName}' renamed to '${file.name}', updating...`)
    this.clearJS(oldName)
    this.loadAndSet(file)
    .then(() => {this.setDirty(null, oldName)}, () => {})
  }

  directoryChanged(): void {
    vLog(`Script directory changed, reloading scripts...`)
    this.reload().then(() => this.setDirty(), (e) => {console.warn(e)})
  }

  isInDomain(file: TAbstractFile): boolean {
    return isInFolder(file, this.directory)
  }
}
