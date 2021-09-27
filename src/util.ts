import { App, MarkdownView, normalizePath, TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import { type } from "os";
import { Stringdex, Stringdexed } from "./types/types";

declare global {
	interface Element {
		addClazz(this: Element, str: string | string[]): void;
		addClazz(this: Element, ...str: string[]): void;
	}
}

Element.prototype.addClazz = function (str: string | string[]) {
	if (Array.isArray(str)) {
		this.addClass(...str)
	} else this.addClass(str)
};

export function getFiles(app: App, dir: string): TFile[] {
	let dirPath = normalizePath(dir)
	let fo = app.vault.getAbstractFileByPath(dirPath);

	// console.log(dirPath), console.log(fo);
	if (!fo || !(fo instanceof TFolder)) throw `Skribi: Could not find folder '${dirPath}'`;

	let files: TFile[] = [];
	Vault.recurseChildren(fo, (fi) => {
		if (fi instanceof TFile) files.push(fi)
	})

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

export function isInFolder(e: TAbstractFile, dir: string) {
	let boo = (normalizePath((/.+\//g).exec(e.path)[0]) == normalizePath(dir))

	return boo
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

export function dLog(...args: any[]) {
	//@ts-ignore
	if (window?.app.plugins.plugins["obsidian-skribi"]?.settings?.devLogging || false) {
		console.log(...args)
	}
}

export function toDupeRecord(arr: string[]): Record<string, string> {
  return arr.reduce((a, i) => ({...a, [i]: i}), {} as Record<string, string>)
}

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



/* Will get active view, or first preview view with same file as active view */
export function getPreviewView(app: App, flip?: boolean): MarkdownView {
	let t1 = flip ? "preview" : "source"
	let t2 = flip ? "source" : "preview"

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

	return view;
}


export const isFunc = (func: any): func is Function => (func instanceof Function)
export const isFile = (item: any): item is TFile => (item) instanceof TFile; 

function invokeMethodOfAndReturn<T>(func: keyof T, objects: Stringdexed<T>) {
  let rets: Stringdex = {};
  for (let o of Object.entries(objects)) {
    if ((o != null) && (isFunc(o[func]))) {
      rets[o[0]] = (o[1][func] as Function)()
    }
  }
  return rets
}

function invokeMethodOf<T>(func: keyof T, ...objects: T[]) {
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

export const getAsyncConstructor = (): FunctionConstructor => new Function('return (async function(){}).constructor')()
