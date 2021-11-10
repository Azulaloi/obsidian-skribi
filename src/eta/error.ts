import { TFile } from "obsidian";
import { EBAR, REGENT_CLS } from "src/types/const";

/* SkribiErrors are for handling errors that are expected to potentially result during normal use. */

/* Generic SkribiError */
export class SkribiError extends Error {
  hasData = true // flags the object to be passed whole in processor error handling

  _sk_invocation?: string = null // The invocating text, if extant (null for template compilation errors)
  _sk_template?: string = null // The source text of the parent template, if extant
  _sk_templateFailure?: { // The failure cache of source template, if source template failed to compile
    id: string;
    error: any;
  };
  _sk_nullTemplate?: string // Flags that the error is from a non-extant template (mutually exclusive with _sk_template and _sk_templateFailure)

  _sk_errorPacket?: { // For packaging internal errors that might need to be displayed, exclusive with above _sk properties
    err: any;
    name: string;
    message: string;
  } = null
  tip?: string // Used for displaying hints in the ErrorModal
  el?: HTMLElement // Used for sending custom elements to display in the ErrorModal

  regentClass: string = REGENT_CLS.error // Used to specify a regent class
  name: string = "SkribiError"
  constructor(msg: string) {
    super(msg)
  }
}

export function skInternalError(name: string | any, message?: string, err?: any): SkribiError {
  if (String.isString(name)) {
    return Object.assign(new SkribiError("Internal Error"), {name: name, message: message ?? "", err: err ?? null}) 
  } else return Object.assign(new SkribiError("Internal Error"), name)
}

export class SkribiInternalError extends Error {

}

/* Used in sk.abort() invocations. */
export class SkribiAbortError extends SkribiError {
  name: string = 'AbortError'
  _sk_abortPacket: any = null
}

/* For handling SyntaxErrors thrown during skribi compilation. */
export class SkribiSyntaxError extends SkribiError {
  constructorError: SyntaxError // Error thrown by function construction
  parseError: SyntaxError // Error thrown by the parser (which we use to try and find the cause of the constructorError)

  packet: { // Data prepared for use by the ErrorModal
    funcLines: string[]
    loc: { line: number, column: number },    
    raisedAt: number,    
    pos: number
  }

  regentClass = REGENT_CLS.syntax_js
}

/* For EtaErrs. Thrown during EtaHandler.getCached() */
export class SkribiEtaSyntaxError extends SkribiError {
  etaError: any
  packet: {
    firstLine: string,
    stack: string | string[]
    loc?: {line: number, col: number, src: string}
  }
  name: string = "EtaSyntaxError"
  regentClass = REGENT_CLS.syntax_eta
}

/* For handling any errors thrown during skribi evaluation. */
export class SkribiEvalError extends SkribiError {
  _sk_function: Function // The unbound compiled function 
  evalError: Error // The caught causal error
}

export class SkribiImportError extends SkribiError {
  name: string = "SkribiImportError"
  _sk_importErrorPacket: {
    err: any,
    file: TFile
  } = null
}

/* Logs an error to the console with appropriate error-specific formatting. */
export function logError(err: any) {
  if (window.app.plugins.plugins["obsidian-skribi"].settings.errorLogging) {
    if (err instanceof SkribiError) {
      if (err instanceof SkribiSyntaxError) {
        console.warn(`SkribiError: syntax error! Displaying info...`, EBAR, err.parseError)

      } else if (err instanceof SkribiEvalError) {
        console.warn(`Skribi: eval error! Displaying content and error...`, EBAR, err.evalError)

      } else {
        console.warn(`Skribi render threw error! Displaying content and error...`, EBAR, err)

      }  
    } else if (err?.name == "Eta Error") {
      console.warn(`Skribi: eta syntax error! Displaying info...`, EBAR, err)

    } else {
      console.warn(`Skribi render threw error! Displaying content and error...`, EBAR, err)
    }
  }
}

function insertPointer(stack: string, msg: string, ch: number) {
  // let spaces = stack.slice(0, index.)
}