import * as Eta from "eta";
import { PartialConfig } from "eta/dist/types/config"
import { CallbackFn } from "eta/dist/types/file-handlers"
import { TemplateFunctionScoped, scopedVars } from "src/types/types"
import { SkribiEvalError } from "./error";
import { Handler } from "./handler"

/** Version of Eta's render function, modified to handle scoped templates */
export function renderEta(
  handler: Handler,
  template: string | TemplateFunctionScoped,
  data: object,
  config?: PartialConfig,
  cb?: CallbackFn,
  scope?: scopedVars,
  binder?: any
  ): string | Promise<string> | void {
  const options = Eta.getConfig(config || {})
  const prepErr = (err: any, func?: Function) => {
    let evalErr = new SkribiEvalError(`${err?.name ?? "Error"} during function evaluation`)
    Object.assign(evalErr, {
      _sk_function: func.toString(),
      evalError: err
    })
    return evalErr
  }

  const gcf = handler.getCached(template, options, scope, binder)
  var ret = null;

  if (options.async) {
    ret = new Promise((resolve) => {
      resolve(gcf.func(scope))
    }).catch((err) => {
      throw prepErr(err, gcf.unboundFunc)
    }) as Promise<string>
  } else {
    try {ret = gcf.func(scope)}
    catch(err) {throw prepErr(err, gcf.unboundFunc)}
  }

  return ret 
}

/** Version of Eta's async render function, just sets async to true */
export function renderEtaAsync(
  handler: Handler,
  template: string | TemplateFunctionScoped,
  data: object,
  config?: PartialConfig,
  cb?: CallbackFn,
  scope?: scopedVars,
  binder?: any
  ): string | Promise<string> | void {
    return renderEta(handler, template, data, Object.assign({}, config, {async: true}), cb, scope, binder)
}