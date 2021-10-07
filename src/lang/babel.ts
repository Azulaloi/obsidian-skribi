import { Stringdex } from 'src/types/types'
import { isExtant, vLog, vWarn } from 'src/util'
import en from './locale/en.json'
import en_gb from './locale/en_gb.json'

// Doubt this will be used but I wanted to do it anyway

type locale = Partial<typeof en> & Stringdex<string>

type l = {'_': (key: keyof typeof en, ...args: string[]) => string} & typeof en & Stringdex<string>

const locales: Stringdex<locale> & {en: Stringdex<string> & typeof en} = {
  en: en,
  'en-gb': en_gb
}

function make(): l {
  let out = {
    '_': t
  }
  
  for (let key of Object.keys(en)) {
    if (String.isString((en as Stringdex)[key])) {
      Object.defineProperty(out, key, {
        get: function() {
          return locale()?.[key] ?? (en as locale)[key]
        }
      })
    }
  }

  vLog('Locale definitions constructed')
  return out as l
}

function locale(): locale {return locales?.[window.moment.locale()]}

/* Pull localized strings from this. */
export const l: l = make()

/**
 * @param key Lang file string key to return local version of
 * @param args Strings to insert into insertion tags (eg '%0')
 * @returns Localized string */
function t(key: keyof typeof en, ...args: string[]): string {
  if (!isExtant((en as any)[key])) vWarn(`Babel received undefined key: ${key}`);
  let str: string = l[key] ?? (en as locale)[key] ?? `$${key}` 
  return str.replace((/%(\d+)/g), (t, n) => (void 0 !== args[n] ? args[n] : t))
}

