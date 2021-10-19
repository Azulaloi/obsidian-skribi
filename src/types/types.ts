import { EtaConfig } from "eta/dist/types/config";
import { CallbackFn } from "eta/dist/types/file-handlers";
import { TAbstractFile, TFile } from "obsidian";
import { SkribiChild } from "src/render/child";
import { Modes, Flags } from "./const";

export interface SkContext {
	time: number, // Time of initial render promise dispatch
	flag: number,
	depth: number, 
	source: string, // Original text content
	ctx?: any	// Stores passed template values, null on non-templates
}

export interface ProcessorMode {
	srcType: Modes
	flag?: Flags
}

export interface Template {
	file: TFile
}

export declare type Stringdex<T = any> = {[index: string]: T}

export interface ArgSet {[index: string]: string | string[]};

export enum promptTypes {
  string = "string"
}

/* An object created from template metadata, used by insertionModal. */
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

export interface DynamicState {
  el: HTMLElement,
  file: TFile,
  child: SkribiChild
}

/* For objects that must react to file change events */
export interface FileMinder {
	fileRenamed(file: TAbstractFile, oldName: string): void
	fileAdded(file: TAbstractFile): void
	fileDeleted(file: TAbstractFile): void
	fileUpdated(file: TAbstractFile): void
	directoryChanged(): void
	isInDomain(file: TAbstractFile): boolean
	directory: string
}

export type queuedTemplate = {
	function: Function,
	element: HTMLElement
}