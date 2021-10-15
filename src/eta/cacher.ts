/* This is slightly modified from Eta */

export class Cacher<T> {
  constructor(private cache: Record<string, T>) {}
  define(key: string, val: T): void {this.cache[key] = val}
  get(key: string): T {return this.cache[key]}
  remove(key: string): void {delete this.cache[key]}
  reset(): void {this.cache = {}}
  load(cacheObj: Record<string, T>): void {copyProps(this.cache, cacheObj)}
  has(key: string): boolean {
    return !((this.cache[key] === null ) || (this.cache[key] === undefined))
  }
}

export function copyProps<T>(toObj: T, fromObj: T): T {
  for (const key in fromObj) {
    if (hasOwnProp((fromObj as unknown) as object, key)) {
      toObj[key] = fromObj[key]
    }
  }
  return toObj
}

export function hasOwnProp(obj: object, prop: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}