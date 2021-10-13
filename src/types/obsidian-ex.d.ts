import "obsidian";
import { App } from "obsidian";
import { DataviewApi } from "obsidian-dataview";
import DataviewPlugin from "obsidian-dataview/lib/main";
import type WeatherAPI from "../../../obsidian-weather/src/api";

declare global {
  interface Window {
    app: App;
  }
}

declare module 'obsidian' {
  interface App {
    plugins: {
      enabledPlugins: Set<string>;
      plugins: {
        [id: string]: any,
        "obsidian-weather"?: {
          API: WeatherAPI
        },
        dataview?: {
          api?: DataviewApi;
        },
      }
    }
  }

  interface Workspace {
		on(name: 'az-weather:api-ready', callback: () => any, ctx?: any): EventRef;
		on(name: 'az-weather:api-unload', callback: () => any, ctx?: any): EventRef;
		on(name: 'az-weather:api-tick', callback: () => any, ctx?: any): EventRef;

    on(name: 'skribi:template-init-complete', callback: () => any, ctx?: string): EventRef;
	}

  interface MetadataCache {
    on(
      name: "dataview:api-ready",
      callback: (api: DataviewPlugin["api"]) => any,
      ctx?: any
    ): EventRef;
    on(
      name: "dataview:metadata-change",
      callback: (
        ...args:
          | [op: "rename", file: TAbstractFile, oldPath: string]
          | [op: "delete", file: TFile]
          | [op: "update", file: TFile]
      ) => any,
      ctx?: any
    ): EventRef;
  }

  interface MarkdownPostProcessorContext {
		containerEl: HTMLElement;
		el: HTMLElement;
		remainingNestLevel: number;
	}

  interface MarkdownPreviewView {
    loaded: boolean;
		getFile(): TFile; 							// returns file
    renderer: MarkdownPreviewRenderer;
    clear(): void;
  }

  interface MarkdownPreviewRenderer {
		scrolling: boolean;
		
		previewEl: HTMLElement;
		pusherEl: HTMLElement;
		sizerEl: HTMLElement;
		text: string;
	}

  interface MarkdownSubView {
    type: "preview" | "source"
  }
}
