import * as Eta from "eta";
import { App } from "obsidian";
import SkribosPlugin from "./main";

const obsidianModule = require("obsidian");

export class EtaHandler {
  varName: string;

  baseContext: {[index: string]: any} = { 
    obsidian: obsidianModule 
  }

  constructor(app: App, plugin: SkribosPlugin) {
    this.varName = plugin.varName;
  }


  async renderAsync(content: string, ctxIn?: any): Promise<string> {
    let context = ctxIn || {};

    content = Eta.renderAsync(content, context, { 
      varName: this.varName
    }) as string;

    return content;
  }

  render(content: string, ctxIn?: any) {
    let context = ctxIn || {};

    content = Eta.render(content, context, { 
      varName: this.varName
    }) as string;

    return content;
  }
}