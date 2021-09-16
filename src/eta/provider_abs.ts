import { Stringdex } from "src/types";
import { ProviderBus } from "./provider_bus";

export interface IProvider {

  bus: ProviderBus
  namespace: string;
  functions: Map<string, any>;
  createObject(): Stringdex;
  init(): Promise<void>;                   // Called once, on bus load
  unload(): void;                 // Called once, on bus unload
  reload(): void;                 // May be called multiple times
}

export abstract class Provider implements IProvider {
  bus: ProviderBus;
  namespace: string;
  functions: Map<string, any> = new Map()
  initLoaded = false;

  constructor(bus: ProviderBus) {
    this.bus = bus
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
  reload(): void {}
}