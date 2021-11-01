import { SkribosSettings } from "src/settings";
import { Stringdex } from "src/types/types";

export type renderModalPreset = {
  index: number // order in list
  name: string
  key: string
  append: string
  arguments?: Stringdex<string>
}

export interface PluginData {
  settings: SkribosSettings;
  renderModalPresets: Record<string, renderModalPreset>//Stringdex<renderModalPreset>
}