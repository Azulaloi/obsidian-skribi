
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

  name: string = "SkribiError"
  constructor(msg: string) {
    super(msg)
  }
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

  constructor(msg: string) {
    super(msg);
  }
}

/* For handling any errors thrown during skribi evaluation. */
export class SkribiEvalError extends SkribiError {
  _sk_function: Function // The unbound compiled function 
  evalError: Error // The caught causal error

  constructor(msg: string) {
    super(msg)
  }
}