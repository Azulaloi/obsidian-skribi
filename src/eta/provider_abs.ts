import { Plugin } from "obsidian";
import { Stringdex } from "src/types/types";
import { isExtant } from "src/util/util";
import { ProviderBus } from "./provider_bus";

export interface IProvider {
  id: string
  bus: ProviderBus
  functions: Map<string, any>;
  createObject(): Stringdex;
  init(): Promise<void>;                   // Called once, on bus load
  unload(): void;                         // Called once, on bus unload
  reload(): Promise<any>;                 // May be called multiple times

  setDirty(): void;
  postDirty?(): void;
}

export abstract class Provider implements IProvider {
  id: string
  bus: ProviderBus;
  functions: Map<string, any> = new Map()
  initLoaded = false;
  isDirty: boolean = false;

  constructor(bus: ProviderBus, id: string) {
    this.bus = bus
    this.id = id
  }

  [index: string]: any;

  createObject(...args: any): Stringdex {
    return {...Object.fromEntries(this.functions)}
  }

  init(): Promise<void> {
    this.initLoaded = true
    return Promise.resolve()
  }

  unload(): void {}
  reload(): Promise<any> {
    return Promise.resolve()
  }

  /**
   * @param clean If true, provider.isDirty = false */
  setDirty(dirty?: boolean, ...data: any) {
    this.isDirty = isExtant(dirty) ? dirty : true
    this.bus.providerNotificationDirty(this, this.isDirty, ...data)
  }

  /* May be called without data. */
  postDirty(...args: any[]): void {}
}

/** 
 * Predicated providers are responsible for modules that require certain conditions to function */
export interface IProviderPredicated extends IProvider {
  predicateCheck(): boolean
  predicateError(): string
  getPredicate(): Plugin
}
 
export abstract class ProviderPredicated extends Provider implements IProviderPredicated {
  predicatePluginName: string = ''
  
  getPredicate() {
    return this.bus.plugin.app.plugins.plugins?.[this.predicatePluginName] || null
  }

  /**
   * @returns true only when the predicate condition is met */
  predicateCheck() {
    return this.bus.plugin.app.plugins.enabledPlugins.has(this.predicatePluginName)
  }

  /**
   * @returns An error string describing the unmet predicate condition */
  predicateError() {
    return `Integration Module '${this.id}' not available, could not find required plugin: '${this.predicatePluginName}'`
  }
}