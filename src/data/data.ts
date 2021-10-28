import { SkribosSettings } from "src/settings";
import { Stringdex } from "src/types/types";

type renderModalPreset = {
  key: string
  arguments: Stringdex<string>
}

export interface PluginData {
  settings: SkribosSettings;
  renderModalPresets: Stringdex<renderModalPreset>
}