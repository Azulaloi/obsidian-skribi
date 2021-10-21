/*
 * Copyright 2019 Ben Gubler <nebrelbug@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/* 
 * Modified from Eta (https://github.com/eta-dev/eta) 
 */

import { AstObject } from "eta/dist/types/parse"
import * as Eta from "eta";
import { EtaConfig } from "eta/dist/types/config";

/* Modified slightly, so as to help the syntax error parser. */
export default function compileToString(str: string, config: EtaConfig): string {
  const buffer: Array<AstObject> = Eta.parse(str, config)

  let res =
    "var tR='',__l,__lP" +
    (config.include ? ',include=E.include.bind(E)' : '') +
    (config.includeFile ? ',includeFile=E.includeFile.bind(E)' : '') +
    '\nfunction layout(p,d){__l=p;__lP=d}\n' +
    (config.useWith ? 'with(' + config.varName + '||{}){' : '') +
    compileScope(buffer, config) +
    (config.includeFile
      ? 'if(__l)tR=' +
        (config.async ? 'await ' : '') +
        `includeFile(__l,Object.assign(${config.varName},{body:tR},__lP))\n`
      : config.include
      ? 'if(__l)tR=' +
        (config.async ? 'await ' : '') +
        `include(__l,Object.assign(${config.varName},{body:tR},__lP))\n`
      : '') +
    /*'if(cb){cb(null,tR)}*/ 'return tR' +
    (config.useWith ? '}' : '')

  if (config.plugins) {
    for (let i = 0; i < config.plugins.length; i++) {
      const plugin = config.plugins[i]
      if (plugin.processFnString) {
        res = plugin.processFnString(res, config)
      }
    }
  }

  return res
}

/* Modified slightly, so as to help the syntax error parser. */
function compileScope(buff: Array<AstObject>, config: EtaConfig) {
  let i = 0
  const buffLength = buff.length
  let returnStr = ''

  for (i; i < buffLength; i++) {
    const currentBlock = buff[i]
    if (typeof currentBlock === 'string') {
      const str = currentBlock

      // we know string exists
      returnStr += "tR+='" + str + "';\n"
    } else {
      const type = currentBlock.t // ~, s, !, ?, r
      let content = currentBlock.val || ''

      if (type === 'r') {
        // raw

        if (config.filter) {
          content = 'E.filter(' + content + ')'
        }

        returnStr += 'tR+=' + content + ';\n'
      } else if (type === 'i') {
        // interpolate

        if (config.filter) {
          content = 'E.filter(' + content + ')'
        }

        if (config.autoEscape) {
          content = 'E.e(' + content + ')'
        }
        returnStr += 'tR+=' + content + ';\n'
        // reference
      } else if (type === 'e') {
        // execute
        returnStr += content + ';\n' // you need a \n in case you have <% } %>
      }
    }
  }

  return returnStr
}