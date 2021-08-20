import * as Eta from "eta";
import { App } from "obsidian";
import SkribosPlugin from "./main";

const obsidianModule = require("obsidian");

export class EtaHandler {
  baseContext: {[index: string]: any} = { 
    obsidian: obsidianModule 
  }

  constructor(app: App, plugin: SkribosPlugin) {

  }

  // the embed renderer only renders elements that have been rendered when the value is returned from the postprocessor
  // more clearly: if made to wait by an async inside the renderer, the internal embedder will move along before we are done with our elements
  // even more clearly: async breaky my embeds :(
  async renderAsync(content: string, ctxIn?: any): Promise<string> {
    let context = ctxIn || {};

    content = await Eta.renderAsync(content, context, { 
      varName: "sk" 
    }) as string;

    return content;
  }

  render(content: string, ctxIn?: any) {
    let context = ctxIn || {};

    content = Eta.render(content, context, { 
      varName: "sk" 
    }) as string;

    return content;
  }
}