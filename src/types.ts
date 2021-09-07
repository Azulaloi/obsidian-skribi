import { TFile } from "obsidian";
import { Modes, Flags } from "./const";

declare module "obsidian" {
	interface MarkdownPostProcessorContext {
		containerEl: HTMLElement;
		el: HTMLElement;
		remainingNestLevel: number;
	}
}

export interface SkContext {
	time: number,
	flag: number,
	depth: number,
	ctx?: any
}

export interface ProcessorMode {
	srcType: Modes
	flag?: Flags
}

export interface Template {
	file: TFile
}

export interface ArgSet {[index: string]: string | string[]};