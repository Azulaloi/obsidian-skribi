import type { Stringdex } from 'src/types/types'
import { isExtant, vLog, vWarn } from 'src/util/util'
import en from './locale/en.json'
import en_gb from './locale/en_gb.json'

/** A localized lexicon. */
type LocLex = Partial<typeof en> & Stringdex<string>

/** The global lexicon. */
type Babel = {
  '_': (key: keyof typeof en | string, ...args: string[]) => string
} & typeof en 
/* NOTE: this is just cause VSC sometimes refuses to update the json definitions without having to restart and open all my terminals again */
& Stringdex<string>

/** The available local lexicons. */
const LOCALES: Stringdex<LocLex> & {en: Stringdex<string> & typeof en} = {
  'en': en,
  'en-gb': en_gb
}

/** Constructs the babel lexicon object. Keys defined in the lexicon for the current Obsidian locale are prioritized, defaulting to English if the key or local lex is not available. */
function constructLexicon(): Babel {
  const lex = {'_': t}
  
  for (let key of Object.keys(en)) {
    if (String.isString((en as Stringdex)[key])) {
      Object.defineProperty(lex, key, {
        get: function() {
          return getLocalLex()?.[key] ?? (en as LocLex)[key]
        }
      })
    }
  }

  vLog('Locale definitions constructed')
  return lex as Babel
}

/** Returns the lexicon for the Obsidian locale, or null if no appropriate lexicon exists. */
function getLocalLex(): LocLex | null {
  return LOCALES?.[window.moment.locale()]
}

/** The global lexicon. Values are pulled from the appropriate locale file, if available. */
export const l: Babel = constructLexicon()

/** Gets localized strings and replaces insertion tags (%i) in the string with provided values. 
 * Necessary for strings with a variable that may change position in the string depending on the locale. 
 * When using this method, you won't get the property definition tooltips in VSC.
 * @param key string key to return local version of
 * @param args strings to insert into insertion tags (ex: '%0' in the string will be replaced with the zeroth arg string) */
function t(key: keyof typeof en, ...args: string[]): string {
  if (!isExtant((en as any)[key])) vWarn(`Babel received undefined key: ${key}`);
  let str: string = l[key] ?? (en as LocLex)[key] ?? `$${key}` 
  return str.replace((/%(\d+)/g), (t, n) => (void 0 !== args[n] ? args[n] : t))
}

