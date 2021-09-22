import { FileSystemAdapter, TAbstractFile, TFile } from "obsidian";
import { dLog, filterFileExt, getFiles, isFile, withoutKey } from "src/util";
import { Provider } from "../provider_abs";

export class ProviderScriptloader extends Provider {

  async init() {
    return this.initLoad().then(() => super.init())
  }

  async initLoad() {
    return this.loadAndSet(...getFiles(this.bus.plugin.app, this.bus.plugin.settings.scriptFolder))
  }

  async loadAndSet(...file: TFile[]) {
    return this.readFiles(...file)
    .then((ret) => {this.setFunc(ret); return Promise.resolve()});
  }

  setFunc(funcs: [string, Function][]) {
    console.log('Scriptloader: setFunc', funcs)

    funcs.map((r) => {if (r) {
      this.functions.delete(r[0])
      if (Array.isArray(r[1]))
        this.functions.set(r[0], 
          (Array.isArray(r[1]) ? Object.fromEntries(r[1]) : r[1]))
    }})
  }

  async readFiles(...files: TFile[]): Promise<[string, Function][]> {
    let filtered = filterFileExt(files, "js")
    const reads = filtered.map(async (f) => {
      try {
        if (!(this.bus.plugin.app.vault.adapter instanceof FileSystemAdapter)) return Promise.reject();
        let path = this.bus.plugin.app.vault.adapter.getBasePath() + "/" + f.path
        
        if (Object.keys(window.require.cache).contains(window.require.resolve(path))) delete window.require.cache[window.require.resolve(path)]

        let func = await import(path)

        if (func?.default) {
          return (func.default instanceof Function) 
            ? Promise.resolve([f.basename, func.default])
            : Promise.resolve([f.basename, Object.keys(withoutKey(func, "default")).map((k) => [k, func[k]])])
        } else return Promise.reject()
      } catch(e) {
        console.warn(e)
        return Promise.reject()
      }      
    })

    return await Promise.allSettled(reads)
    .then((settled) => { return settled
      .filter((r) => {return r.status == "fulfilled"})
      .map((v) => {return (v as PromiseFulfilledResult<[string, Function]>).value})
    })
  }

  clearJS(...files: TFile[]) {
    console.log('Scriptloader: clearing', files)
    for (let f of filterFileExt(files, "js")) {
      this.functions.delete(f.basename)
    }
  }

  // Event listeners for file events registered by EtaHander
  fileUpdated(file: TAbstractFile): void {
    if (!isFile(file)) return;
    dLog('Scriptloader: fileUpdated', file)
    this.clearJS(file)
    this.loadAndSet(file)
    .then(() => {this.setDirty()}, () => this.clearJS(file))
  }

  fileDeleted(file: TAbstractFile): void {
    if (!isFile(file)) return;
    dLog('Scriptloader: fileDeleted', file)
    this.clearJS(file)
    this.setDirty()
  }

  fileAdded(file: TAbstractFile): void {
    if (!isFile(file)) return;
    dLog('Scriptloader: fileAdded', file)
    this.loadAndSet(file)
    .then(() => {this.setDirty()}, () => this.clearJS(file))
  }

  async reload() {
    this.functions.clear()
    await this.initLoad()
    return super.reload()
  }
}
