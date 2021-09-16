import { FileSystemAdapter, TAbstractFile, TFile } from "obsidian";
import { filterFileExt, getFiles, withoutKey } from "src/util";
import { Provider } from "../provider_abs";
import { ProviderBus } from "../provider_bus";

export class ProviderScriptloader extends Provider {

  namespace = "s"
  initLoaded = false;

  constructor(bus: ProviderBus) {
    super(bus)    
  }

  async init() {
    return this.loadFiles(...getFiles(this.bus.plugin.app, this.bus.plugin.settings.scriptFolder))
    .then((ret) => {
      this.setFunc(ret)
      this.initLoaded = true;
      return Promise.resolve();
    })
  }

  setFunc(funcs: [string, Function][]) {
    
    funcs.map((r) => {if (r) {
      this.functions.delete(r[0])
      if (Array.isArray(r[1]))
        this.functions.set(r[0], 
          (Array.isArray(r[1]) ? Object.fromEntries(r[1]) : r[1]))
    }})
  }

  async loadFiles(...files: TFile[]): Promise<[string, Function][]> {
    let filtered = filterFileExt(files, "js")
    const reads = filtered.map(async (f) => {
      try {
        if (!(this.bus.plugin.app.vault.adapter instanceof FileSystemAdapter)) return Promise.reject();
        let path = this.bus.plugin.app.vault.adapter.getBasePath() + "/" + f.path

        if (Object.keys(window.require.cache).contains(path)) delete window.require.cache[window.require.resolve(path)]

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
    for (let f of filterFileExt(files, "js")) {
      this.functions.delete(f.basename)
    }
  }

  fileUpdated(e: TAbstractFile) {
    if (!(e instanceof TFile)) return;
    this.bus.handler.setDirty(true)

    this.clearJS(e)
		this.loadFiles(e).then((ret) => this.setFunc(ret), (err) => this.clearJS(e))
	}

  fileDeleted(e: TAbstractFile) {
    if (!(e instanceof TFile)) return;
    this.clearJS(e)
  }

  fileAdded(e: TAbstractFile) {
    this.fileUpdated(e)
  }

  reload() {
    this.functions.clear()
    return this.init()
  }
}