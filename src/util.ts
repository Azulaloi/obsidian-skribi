import { App, normalizePath, TFile, TFolder, Vault } from "obsidian";

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