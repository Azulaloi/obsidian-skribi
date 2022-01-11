import { App, MarkdownView, normalizePath, TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import { EBAR } from "../types/const";
import { Stringdex } from "../types/types";

export function ensureArray<T>(obj: T | T[]): Array<T> {
	return Array.isArray(obj) ? obj : [obj]
}

export function getFiles(app: App, dir: string): TFile[] {
	let dirPath = normalizePath(dir)
	let fo = app.vault.getAbstractFileByPath(dirPath);

	if (!fo || !(fo instanceof TFolder)) throw new Error(`Could not locate directory "${dirPath}"`)

	let files: TFile[] = [];
	Vault.recurseChildren(fo, (fi) => {
		if (fi instanceof TFile) files.push(fi)
	})

	// console.log(files)
	return files;
}

export function checkFileExt(files: TFile[] | TFile, exts: string[] | string): boolean {
	exts = toArray(exts); 
	return toArray(files).every((f) => {return exts.contains(f.extension)})
}

export function filterFileExt(files: TFile[] | TFile, exts: string[] | string): TFile[] {
	exts = toArray(exts)
	return toArray(files).filter((f) => {if (checkFileExt(f, exts)) return f})
}

export function toArray(args: any | any[]): any[] {
	return (Array.isArray(args) ? args : [args])
}

export function isInFolder(file: TAbstractFile, directory: string) {
	return normalizePath(file.parent.path /* (/.+\//g).exec(e.path)[0] */) === normalizePath(directory)
}

export function isExtant(obj: any) {
	return !((obj === null ) || (obj === undefined))
}

export function roundTo(x: any, to?: number): number {
  return parseFloat(parseFloat(x).toPrecision(to ?? 4));
}

function getVerbosity() {
	//@ts-ignore
	return window.app.plugins.plugins["obsidian-skribi"]?.settings.verboseLogging || false;
}

export function vLog(...args: any[]) {
	if (getVerbosity()) {
		console.log("Skribi:", ...args )
	}
}

export function vWarn(...args: any[]) {
	if (getVerbosity()) {
		console.warn("Skribi:", ...args)
	}
}

/** Logs only if the devLogging setting is enabled. */
export function dLog(...args: any[]) {
	if (window?.app.plugins.plugins["obsidian-skribi"]?.settings?.devLogging || false) {
		console.log(...args)
	}
}

/* Takes an array of strings and returns a record of key/value pairs for each, where the key and value are the same */
export function toDupeRecord(arr: string[]): Record<string, string> {
  return arr.reduce((a, i) => ({...a, [i]: i}), {} as Record<string, string>)
}

/** 
 * @param input An object to clone
 * @param keys The keys of properties to omit from the clone
 * @returns A clone of 'input' without the omitted properties */
export function withoutKey<T extends { [K in keyof T]: string | number | symbol }>(input: {[index: string]: any}, key: string | string[]) {
  const clone = { ...input };
  if (Array.isArray(key)) {
      (key as string[]).forEach((k) => {
          delete clone[k]
      })
  } else { delete clone[key] }
  return clone;
}

export const asyncFunc = Object.getPrototypeOf(async function(){}).constructor
export const promiseImpl: PromiseConstructor = new Function('return this')().Promise
export const getAsyncConstructor = (): FunctionConstructor => new Function('return (async function(){}).constructor')()

/**
 * @param App
 * @param flip If true, target is editor mode. Otherwise, target is preview mode.
 * @returns First markdown view of target mode with same file as active view, or active view if none was found. Null if no active view exists. */
export function getPreviewView(app: App, flip?: boolean): MarkdownView | null {
	let t1 = flip ? "preview" : "source"
	let t2 = flip ? "source" : "preview"

	try {
	var view = app.workspace.getActiveViewOfType(MarkdownView);
	if (view.getMode() == t1) {
		app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
			if ((leaf.view as MarkdownView).getMode() == t2) {
				let z = (leaf.view as MarkdownView).previewMode
				if (z.getFile() == view.file) {
					view = leaf.view as MarkdownView
				}
			}
		})
	}
	} catch (e) {

	}

	return view || null;
}

export const isFunc = (func: any): func is Function => (func instanceof Function)
export const isFile = (item: any): item is TFile => (item) instanceof TFile; 

function invokeMethodOfAndReturn<T>(func: keyof T, objects: Stringdex<T>) {
  let rets: Stringdex = {};
  for (let o of Object.entries(objects)) {
    if ((o != null) && (isFunc(o[func]))) {
      rets[o[0]] = (o[1][func] as Function)()
    }
  }
  return rets
}

export type NonUndefined<A> = A extends undefined ? never : A;
export type FunctionKeys<T extends object> = {
  [K in keyof T]-?: NonUndefined<T[K]> extends Function ? K : never;
}[keyof T];

type ParametersOf<T extends (...args: any) => any> = {
	[P in keyof Parameters<T>]-?: Parameters<T>}[keyof T];

export function invokeMethodOf<T>(func: keyof T, ...objects: T[]) {
	for (let o of objects) {
    if ((o != null) && (isFunc(o[func]))) {
      try {
        (o[func] as unknown as Function)()
      } catch(err) {
        console.warn(`invokeMethodOf: caught error! \n`, `Key called as method:`, func,  `Called on:`, o, `Error:`, err)
      }
    }
  }
}

export function invokeMethodWith<T extends object>(objects: T | T[], key: FunctionKeys<T>, ...args: /* ParametersOf<T[key]> */ any[]): void {
	for (let o of ensureArray(objects)) {
		try {
			(o[key] as unknown as Function)(...args)
		} catch(err) {
			console.warn(`invokeMethodWith: caught error! \n Key: '${key}' called on:`, o, EBAR, err)
		}
	}
}

export function average(...numbers: number[]) {
  return numbers.reduce((val, cur) => val+cur)/numbers.length
}

/* Get link to documentation page. */
export function linkDocs(page: string) {
	// return `https://azulaloi.net/obsidian-skribi/${page}`
	return `https://azulaloi.github.io/obsidian-skribi/${page}`
}

/* Creates a link that opens the Skribi Settings tab. */
export function makeSettingsLink(elIn?: HTMLElement) {
  let el = elIn ?? createDiv()
	el.createSpan({text: "Open Skribi Settings", cls: 'skr-button'})
	openSettingsOnClick(el)
  return el
}

export function openSettingsOnClick(el: HTMLElement) {
  el.addEventListener('click', (ev) => {
    window.app.setting.open()
    window.app.setting.openTabById('obsidian-skribi')
  })
}

/* Prefixes string with plugin name. Makes reusing code across plugins easier. */
export function kls(cls: string) {return `skribi-${cls}`}

export function hash(str: string) {
	let hash = 5381;
	let i = str.length;
	while (i) {
		hash = (hash * 33) ^ str.charCodeAt(--i);
	}
	return hash >>> 0;
}

export type Values<T extends object> = T[keyof T];