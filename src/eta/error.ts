export class SkribiError extends Error {
  hasData = true // flags the object to be passed whole in processor error handling

  _sk_invocation: string = null // The invocating text
  _sk_template?: string = null // The source text of the parent template, if extant
  
  constructor(msg: string) {
    super(msg)
  }
}

export class SkribiSyntaxError extends SkribiError {

  constructorError: SyntaxError
  parseError: SyntaxError
  packet: {
    funcLines: string[]
    loc: { line: number, column: number },    
    raisedAt: number,    
    pos: number
  }

  skSrc: string // assigned in processor error handling

  name: string = "SkribiError"
  constructor(msg: string) {
    super(msg);
  }
}

export class SkribiEvalError extends SkribiError {
  _sk_function: Function // The unbound compiled function 

  evalError: Error

  name: string = "SkribiError"
  constructor(msg: string) {
    super(msg)
  }
}