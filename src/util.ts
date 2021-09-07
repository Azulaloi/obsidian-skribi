import { App, normalizePath, TFile, TFolder, Vault } from "obsidian";

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
	if (!fo || !(fo instanceof TFolder)) throw "bronk";

	let files: TFile[] = [];
	Vault.recurseChildren(fo, (fi) => {
		if (fi instanceof TFile) files.push(fi)
	})

	return files;
}

export function isExtant(obj: any) {
	return !((obj === null ) || (obj === undefined))
}

export function roundTo(x: any, to?: number): number {
  return parseFloat(parseFloat(x).toPrecision(to ?? 4));
}

function getVerbosity() {
	//@ts-ignore
	return window?.app.plugins.plugins["obsidian-skribos"]?.settings?.verboseLogging || false;
}

export function vLog(...args: any[]) {
	if (getVerbosity()) {
		console.log("Skribi:", ...args )
	}
}


export function dLog(...args: any[]) {
	//@ts-ignore
	if (window?.app.plugins.plugins["obsidian-skribos"]?.settings?.devLogging || false) {
		console.log(...args)
	}
}