import { TFile } from "obsidian";

export interface Template {
	file: TFile
}

export interface ArgSet {[index: string]: string | string[]};

export const DELIMITERS: ArgSet = {
	"PASS_VALUE": [":"]
}