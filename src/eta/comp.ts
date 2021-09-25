import * as Eta from "eta";
import { PartialConfig } from "eta/dist/types/config"
import { CallbackFn } from "eta/dist/types/file-handlers"
import { TemplateFunctionScoped, scopedVars } from "src/types/types"
import { dLog, getAsyncConstructor, promiseImpl } from "src/util"
import { EtaHandler } from "./eta"

/** Adds the entries of scope to a function string. 
* @param functionString A string function compiled by Eta's compileToString() 
* @param keys Array of keys that the returned function will expect to be present in its scope argument
* @param async If true, returned function will be asynchronous */
export function compileWith(functionString: string, keys: string[], async?: boolean): TemplateFunctionScoped {
  var a = ""; var b = "";
  for (let k of keys) {
    a += `${k},`
    b += `'${k}',`
  }
  let func = `var {${a.substr(0, a.length-1)}} = scope;\n` + functionString
  let constructor = (async) ? getAsyncConstructor() : Function 
  let compiled = new constructor('scope', func)
  return compiled as TemplateFunctionScoped
}

/* Version of Eta's render function, modified to handle scoped templates */
export function renderEta(
  handler: EtaHandler,
  template: string | TemplateFunctionScoped,
  data: object,
  config?: PartialConfig,
  cb?: CallbackFn,
  scope?: scopedVars,
  binder?: any
  ): string | Promise<string> | void {
  const options = Eta.getConfig(config || {})

  if (options.async) {
    // if (cb) {
      // try { 
        // const templateFn = handler.getCached(template, options, scope, binder)
        // templateFn(scope)
      // } catch(e) {
        // return cb(e)
      // }
    // } else {

      // return (async () => handler.getCached(template, options, scope, binder)(scope))()
      return new promiseImpl(function (resolve: Function, reject: Function) {
        try {
          resolve(handler.getCached(template, options, scope, binder)(scope))
        } catch (e) {
          reject(e)
        }
      })
    // }
  } else {
    let func = handler.getCached(template, options, scope, binder)
    dLog(`Rendering function`, func)
    return func(scope)
  }
}

/* Version of Eta's async render function, just sets async to true */
/* Note: perf impact of using async templatefunctions is negligible */
export function renderEtaAsync(
  handler: EtaHandler,
  template: string | TemplateFunctionScoped,
  data: object,
  config?: PartialConfig,
  cb?: CallbackFn,
  scope?: scopedVars,
  binder?: any
  ): string | Promise<string> | void {
    return renderEta(handler, template, data, Object.assign({}, config, {async: true}), cb, scope, binder)
}

