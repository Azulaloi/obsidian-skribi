import { Stringdex } from "src/types";
import { ProviderBus } from "./provider_bus";

interface IProvider {
  bus: ProviderBus
  namespace: string;
  functions: Map<string, any>;
  createObject(): Stringdex;
  reload(): void;
}

export abstract class Provider implements IProvider {
  bus: ProviderBus;
  namespace: string;
  functions: Map<string, any> = new Map()

  constructor(bus: ProviderBus) {
    this.bus = bus
  }

  createObject(): Stringdex {
    return {...Object.fromEntries(this.functions)}
  }

  reload(): void {}
}