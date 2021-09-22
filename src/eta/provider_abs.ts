import { Stringdex } from "src/types/types";
import { isExtant } from "src/util";
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

  createObject(): Stringdex {
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
  setDirty(dirty?: boolean) {
    this.isDirty = isExtant(dirty) ? dirty : true
    this.bus.providerNotificationDirty(this, this.isDirty)
  }
}