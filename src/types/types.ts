import { EtaConfig } from "eta/dist/types/config";
import { CallbackFn } from "eta/dist/types/file-handlers";
import { MarkdownPostProcessorContext, TAbstractFile, TFile } from "obsidian";
import { SkribiChild } from "src/render/child";
import { Modes, Flags } from "./const";

export type Nullish = null | undefined
export type Extant<K> = K extends Nullish ? never : K
export type Nullable<K> = K | Nullish

export type Stringdex<T = any> = {[index: string]: T}

export type SkribiResult = SkribiResultRendered | SkribiResultQueued | void
export type SkribiResultRendered = [Promise<HTMLDivElement>, SkribiChild]
export type SkribiResultQueued = {msg: string, qi: number}

/** The skribi processor pipeline context packet. */
export interface SkContext {
	time: number, // Time of initial render promise dispatch
	flag: number,
	depth: number, 
	source: string, // Original text content
	ctx?: any,	// Stores passed template values, null on non-templates
	entryPacket?: [ProcessorMode, HTMLElement, MarkdownPostProcessorContext, number, boolean, string]
}

/** Used by the processor to determine the type of invocation being processed. */
export interface ProcessorMode {
	srcType: Modes
	flag?: Flags
}

// doesn't seem to be used? TODO: remove
export interface Template {
	file: TFile
}

export interface ArgSet {[index: string]: string | string[]};

export enum promptTypes {
  string = "string"
}

/** An object created from template metadata, used by insertionModal. */
export interface fieldPrompt {
	[index: string]: any
	id: string
	type: promptTypes
	name: string
	placeholder: string
	default: string
}

/** An object containing the variables for a scoped template function. */
export interface scopedVars extends Stringdex {
  sk: object, 
  E: EtaConfig, 
  cb?: CallbackFn, 
  scope?: Stringdex
}

/** A template function that has been scoped. */
export declare type TemplateFunctionScoped = (scope: scopedVars) => Promise<string>;

/** Used for passing context and scope information around. */
export interface DynamicState {
  el?: HTMLElement,
  file?: TFile,
  child?: SkribiChild,
}

/** For objects that must react to file change events. Used by the script loader and template loader. */
export interface FileMinder {
	fileRenamed(file: TAbstractFile, oldName: string): void
	fileAdded(file: TAbstractFile): void
	fileDeleted(file: TAbstractFile): void
	fileUpdated(file: TAbstractFile): void
	directoryChanged(): void
	isInDomain(file: TAbstractFile): boolean
	directory: string
}

/** A template invocation that has been queued for rendering.
 * Used when the template cache has not yet initialized. */
export type queuedTemplate = {
	function: (el: HTMLElement, time: number) => Promise<SkribiResult>,
	element: HTMLElement
}

/** A cached compiled template. */
export interface TemplateCache {
  source?: string,
  function: TemplateFunctionScoped,
  frontmatter?: Stringdex,
  extension?: string // optional to support future methods of atypical (non-file) caching
}

/** A cached template compilation error. 
 * Stored so that it may be accessed through the template index modal's list of errored templates. */
export interface TemplateErrorCache {
  source: string,
  error: any,
  extension?: string 
}