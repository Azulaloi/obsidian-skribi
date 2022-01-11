import { FileSystemAdapter, TAbstractFile, TFile } from "obsidian";
import { EBAR } from "src/types/const";
import { DynamicState, FileMinder, Stringdex } from "src/types/types";
import { dLog, filterFileExt, getFiles, isExtant, isFile, isInFolder, vLog, withoutKey } from "src/util/util";
import { SkribiImportError } from "src/engine/error";
import { Provider } from "src/engine/provider/provider";

/** Loads and provides JS files from the skript directory as modules. */
export class ProviderScriptloader extends Provider implements FileMinder {
  loadedModules: Map<string, {name?: string, properties: Stringdex}> = new Map()
  failedModules: Map<string, SkribiImportError> = new Map()

  public async init(): Promise<void> {
    return this.initLoad().then(() => super.init())
  }

  private async initLoad(): Promise<void> {
    return this.loadAndSet(...getFiles(this.bus.plugin.app, this.bus.plugin.settings.scriptFolder))
  }

  /** Attempts to load files as script modules and adds them to the cache. */
  private async loadAndSet(...file: TFile[]): Promise<void> {
    return this.readFiles(...file)
    .then((ret) => {/*vLog('Loading JS modules...', ret);*/ this.stashModule(ret); return Promise.resolve()});
  }

  /** Adds a script module to the cache. */
  private stashModule(modules: [string, Stringdex][]): void {
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

    this.bus.plugin.app.workspace.trigger('skribi:script-index-modified')
  }

  /** Creates the provision object. */
  public createObject(ctx?: DynamicState): Stringdex {
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

    this.failedModules.forEach((err, key) => {
      Object.defineProperty(exports, key, {
        get: function() {
          throw Object.assign(new Error(), {subErr: err})
        }
      })
    })

    return exports
  }

  /** Reads files and attempts to load .js files as modules. Does not add them to the module cache. */
  private async readFiles(...files: TFile[]): Promise<[string, Stringdex][]> {
    let filtered = filterFileExt(files, "js")
    const reads = filtered.map(async (f) => {
      try {
        if (!(this.bus.plugin.app.vault.adapter instanceof FileSystemAdapter)) return Promise.reject();
        let path = this.bus.plugin.app.vault.adapter.getBasePath() + "/" + f.path
        
        let resPath = window.require.resolve(path)
        if (Object.keys(window.require.cache).contains(resPath)) delete window.require.cache[window.require.resolve(resPath)]

        const mod = require(path)

        if (isExtant(mod)) {
          this.failedModules.delete(f.basename)
        }
        
        return isExtant(mod) 
          ? Promise.resolve([f.basename, mod])
          : Promise.reject()
      } catch(e) {
        console.warn(`Skribi: script '${f.name}' failed to load, the script index may contain more details`, EBAR, e)
        this.failedModules.set(f.basename, Object.assign(new SkribiImportError(`${e?.name ?? 'Error'} during script import`), {_sk_importErrorPacket: {err: e, file: f}}))
        return Promise.reject()
      }      
    })

    return await Promise.allSettled(reads)
    .then((settled) => { return settled
      .filter((r) => {return r.status == "fulfilled"})
      .map((v) => {return (v as PromiseFulfilledResult<[string, Stringdex]>).value})
    })
  }

  /** Deletes modules by string name or file of origin. */
  private clearJS(...items: Array<TFile | string>): void {
    let names = items.map((item) => {
      if (isFile(item)) return filterFileExt(item, 'js')[0].basename
      else if (String.isString(item)) return item 
    })

    for (let name of names) this.loadedModules.delete(name)
  }

  /** Clears all modules and reloads the scriptloader. */
  public async reload(): Promise<void> {
    this.loadedModules.clear()
    await this.initLoad()
    return super.reload()
  }

  /** Notifies all live skribi children that a script with provided id was updated. */
  public postDirty(id?: string): void {
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
