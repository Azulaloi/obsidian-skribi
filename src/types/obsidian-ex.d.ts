import "obsidian";
import { App } from "obsidian";
import { DataviewApi } from "obsidian-dataview";
import DataviewPlugin from "obsidian-dataview/lib/main";
import SkribosPlugin from "src/main";

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
        "obsidian-skribi": SkribosPlugin,
        "obsidian-weather"?: {
          API: any
        },
        dataview?: {
          api?: DataviewApi;
        }
      }
      enablePlugin: Function;
      disablePlugin: Function;
    }
    setting: {
      open(): void
      openTabById(id: string): void
    }
    commands: {
      listCommands(): Command[]
      removeCommand(id: string): void
      findCommand(id: string): Command | null // Returns command with id 'id', if extant
    }
  }

  interface Workspace {
    // These were from my weather plugin, used for integration provider testing
		on(name: 'az-weather:api-ready', callback: () => any, ctx?: any): EventRef;
		on(name: 'az-weather:api-unload', callback: () => any, ctx?: any): EventRef;
		on(name: 'az-weather:api-tick', callback: () => any, ctx?: any): EventRef;

    on(name: 'skribi:template-init-complete', callback: () => any, ctx?: string): EventRef; // triggered when the initial template cache load is complete
    on(name: 'skribi:template-index-modified', callback: () => any): EventRef; // triggered when any file events occur within the template directory
    on(name: 'skribi:script-index-modified', callback: () => any): EventRef; // triggered when any file events occur within the script directory
    on(name: 'skribi:plugin-load', callback: (id: string) => any): EventRef; // triggered when an obsidian plugin is enabled
    on(name: 'skribi:plugin-unload', callback: (id: string) => any): EventRef; // triggered when an obsidian plugin is disabled
	
    /** Undocumented stack of closeable elements. Open modals are stored here. */
    closeables: CloseableComponent[]
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
		getFile(): TFile; // returns file
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

  interface PopoverSuggest<T> {
    suggestions: {
      setSuggestions(items: T[]): void
    }
    suggestEl: HTMLElement
    reposition(rect: DOMRect): void
    isOpen: boolean
  }
}
