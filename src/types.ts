import { EtaConfig } from "eta/dist/types/config";
import { CallbackFn } from "eta/dist/types/file-handlers";
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

export interface Stringdex {
	[index: string]: any
}

export interface ArgSet {[index: string]: string | string[]};

export enum promptTypes {
  string = "string"
}

export interface fieldPrompt {
	[index: string]: any
	id: string
	type: promptTypes
	name: string
	placeholder: string
	default: string
}

export interface scopedVars extends Stringdex {
  sk: object, 
  E: EtaConfig, 
  cb?: CallbackFn, 
  scope?: Stringdex
}

export declare type TemplateFunctionScoped = (scope: scopedVars) => Promise<string>;