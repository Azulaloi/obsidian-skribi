import * as Eta from "eta";
import { PartialConfig } from "eta/dist/types/config"
import { CallbackFn } from "eta/dist/types/file-handlers"
import { TemplateFunctionScoped, scopedVars } from "src/types/types"
import { dLog, getAsyncConstructor, promiseImpl } from "src/util/util"
import { EtaHandler } from "./eta"
import { parse } from "acorn"
import { SkribiSyntaxError } from "./error";

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
  let func = `var {${a.substr(0, a.length-1)}} = scope\n` + functionString
  let constructor = (async) ? getAsyncConstructor() : Function 
  // let compiled = new constructor('scope', func)

  var compiled = null
  try {
    let c = new constructor('scope', func)
    if (c) {compiled = c}
  } catch(constructorError) {
    if (Object.getPrototypeOf(constructorError)?.name == "SyntaxError") {
      /* If we get a SyntaxError when constructing the function,
        the stack is unhelpful, so we'll use a parser to find the error position. */
      
      let f = func
      try {
        let pa = parse(f, {
          ecmaVersion: 2020,
          allowReturnOutsideFunction: true,
          allowAwaitOutsideFunction: true,
          // locations: true,
          // sourceFile: func
        })
        console.log(pa)
      } catch (parseError) {
        if (Object.getPrototypeOf(parseError)?.name == "SyntaxError") {
          // var util = require('util')
          // console.log(util.inspect(parseError, true, 7, true))
          // let m = (/\((\d*)(?:\:(\d*))\)/).exec(e)
          let m = parseError?.loc?.line
          let s = f.split(/\r\n|\n/)//[parseInt(m[1])]
          // console.log(f.charAt(parseError.raisedAt))
          // console.log(f, s)
          // console.log(s[m-1])

          let skerr = new SkribiSyntaxError("SyntaxError during function construction")
          Object.assign(skerr, {
            constructorError: constructorError,
            parseError: parseError,
            packet: {
              funcLines: s,
              loc: parseError?.loc,
              raisedAt: parseError?.raisedAt,
              pos: parseError?.pos
            }
          })

          throw skerr
        }
      }
    }
  }

  
  // console.log(compiled)
  /*
  var util = require('util');
  var vm = require('vm');
  let be = func //js_beautify(func)
  var sandbox: any = {out: null, e: null, str: be, con: constructor};
  var src = "try { out = new con('scope', str) } catch (err) {e = err}";
  vm.runInNewContext(src , sandbox, 'myfile.vm');
  // console.log(util.inspect(sandbox)); 
  // console.log(sandbox?.['e'])
  // console.log(sandbox)
  if (sandbox?.['e']) throw (sandbox?.e?.msg + EBAR + be)//sandbox['e']
  // console.log(sandbox['out'])
  return sandbox['out']
  */

  return compiled as TemplateFunctionScoped
}