import './style/main.scss'
import { CloseableComponent, MarkdownView, Modal, Plugin } from 'obsidian';
import { Handler } from './engine/handler';
import { DEFAULT_SETTINGS, SkribosSettings, SkribosSettingTab } from './settings';
import { SkribiChild } from './render/child';
import { SuggestionModal } from './modal/modal-suggestion';
import { InsertionModal } from './modal/modal-insertion';
import { TestModal } from './modal/modal-test';
import { l } from './lang/babel';
import SkribiProcessor from './render/processor';
import TemplateSuggest from './suggest';
import { CLS } from './types/const';
import { around } from 'monkey-around';
import { IndexTemplateModal } from './modal/modal-index-template';
import RenderModal from './modal/modal-render';
import { IndexScriptModal } from './modal/modal-index-script';
import { Nullable, Stringdex } from './types/types';

export default class SkribosPlugin extends Plugin {
	data: PluginData
	settings: SkribosSettings
	
	eta: Handler
	processor: SkribiProcessor
	suggest: TemplateSuggest

	varName: string = "sk"
	initLoaded: boolean = false

	children: SkribiChild[] = []
	private childProto: any = SkribiChild // for dev memory querying 
	private l = l // for dev testing from console

	async onload() {
		console.log('Skribi: Loading...');

		// await this.loadSettings();
		await this.initData();
		this.addSettingTab(new SkribosSettingTab(this.app, this));
		document.body.toggleClass(CLS.anim, this.settings.cssAnimations)

		this.eta = new Handler(this)
		this.processor = new SkribiProcessor(this)

		this.processor.registerProcessors()
		this.registerEvent(this.app.workspace.on('skribi:template-init-complete', () => {
			this.initLoaded = true
			this.processor.templatesReady()
		}))

		this.defineCommands()
		this.registerExtensions(['eta'], 'markdown')
		this.suggest = new TemplateSuggest(this)
		this.registerEditorSuggest(this.suggest)

		/* Rerender preview views */
		this.app.workspace.onLayoutReady(() => {
			this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
				if ((leaf.view as MarkdownView).currentMode.type == "preview") {
					(leaf.view as MarkdownView).previewMode.rerender(true)
				}
			})
		})

		/* Register plugin status listeners (to listen for integration predicates) */
		const patchPluginLoad = around(this.app.plugins, {
			enablePlugin(old) {
				return function (x: any) {
					this.app.workspace.trigger("skribi:plugin-load", x)
					return old.call(this, x)
				}
			}, 
			disablePlugin(old) {
				return function (x: any) {
					this.app.workspace.trigger("skribi:plugin-unload", x)
					return old.call(this, x)
				}
			}
		})
		this.register(patchPluginLoad)
		
		this.registerEvent(this.app.workspace.on("skribi:plugin-load", (id: string) => {
			Array.from(this.children).forEach(child => child.pluginUpdated(id, true))
		}))
		this.registerEvent(this.app.workspace.on("skribi:plugin-unload", (id: string) => {
			Array.from(this.children).forEach(child => child.pluginUpdated(id))
		}))

		// TODO: toggle this from build mode
		this.app.workspace.onLayoutReady(() => this.reloadModals())
	}
	
	/** Development utility to re-open skribi modals when hot reloading. */
	async reloadModals() {
		document.querySelectorAll("body div.skribi-modal.skribi-unloaded").forEach(async (modalEl) => {
			var modalType: Nullable<string> = /skribi-modal-\S*/.exec(modalEl.classList.value)?.[0]
	
			if (modalType) {
				let parent = await this.findModalParent(modalEl)

				switch (modalType) {
					case "skribi-modal-index-scripts": { 
						parent?.close(); new IndexScriptModal(this).open(); break; 
					}
					case "skribi-modal-index-templates": {
						parent?.close(); new IndexTemplateModal(this).open(); break; 
					}
					case "skribi-modal-error": { 
						parent?.close(); break; 
					}
				}
			}
		})
	}

	/** Locates the first closeable object (such as a modal) in the workspace closeable stack for which the provided element is a container. */
	async findModalParent(el: Element): Promise<CloseableComponent> {
		return this.app.workspace.closeables.find((v) => {
			return (v as Modal)?.containerEl == el 
		})
	}

	/** Register our commands. */
	defineCommands(): void {
		/* Opens a fuzzy suggestion modal of available templates. On selection, opens a template insertion modal that will insert the template invocation string at the cursor. */
		this.addCommand({id: "insert-skribi", name: l['command.insert'], 
			editorCallback: (editor, view) => {
				if (!this.initLoaded) return;
				let x = new SuggestionModal(this);
				new Promise((resolve: (value: string) => void, reject: (reason?: any) => void) => x.openAndGetValue(resolve, reject))
				.then(result => {
					if (this.eta.hasPartial(result)) {
						let i = new InsertionModal(this, editor, result)
						i.open();
					}
				}, (r) => {});
			}})

		/* Reloads the scriptloader. */
		this.addCommand({id: "reload-scripts", name: l['command.reloadScripts'], callback: () => {
			this.eta.bus.scriptLoader.reload().then(() => console.log("Skribi: Reloaded Scripts"));
		}})
		
		/* Reloads all live skribis. */
		this.addCommand({id: "reload-skribis", name: l['command.reloadSkribis'], callback: () => {
			Array.from(this.children).forEach(child => child.rerender(child?.templateKey))
		}})

		/* Opens the performance test modal, autofilling the string to evaluate from the clipboard. */
		this.addCommand({id: "test-performance", name: l['command.perfTest'], callback: async () => {
			let sel = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor?.getSelection()
			let clip = await window.navigator.clipboard.readText();
			let fill = (sel || clip) ? {
				type: l[sel ? 'modal.perf.autofill.selection' : 'modal.perf.autofill.clipboard'],
				value: sel ? sel : clip
			} : null
			
			new TestModal(this, fill).open()
		}})

		/* Opens the template index modal. */
		this.addCommand({id: "view-templates", name: l['command.viewTemplates'], callback: () => {
			new IndexTemplateModal(this).open()
		}})

		/* Opens the script index modal. */
		this.addCommand({id: "view-scripts", name: l['command.viewScripts'], callback: () => {
			new IndexScriptModal(this).open()
		}})

		/* Opens a fuzzy suggestion modal of available templates. On selection, opens a template rendering modal with the selected template. */
		this.addCommand({id: "render-template", name: l['command.renderTemplate'], callback: () => {
			if (!this.initLoaded) return;
			let x = new SuggestionModal(this, true);
			new Promise((resolve: (value: string) => void, reject: (reason?: any) => void) => x.openAndGetValue(resolve, reject))
			.then(result => {
				console.log(result)
				if (this.eta.hasPartial(result)) {
					let i = new RenderModal(this, result)
					i.open();
				}
			}, (r) => {});
		}})

		/* Registers the user-configured render modal presets as commands, which open the render modal with the parameters defined in the preset. */
		for (let preset of Object.entries(this.data?.renderModalPresets ?? {}) as [string, renderModalPreset][]) {
			this.addCommand({id: `render-preset_${preset[0]}`, name: `Render Preset - ${preset[1].name}`, callback: () => {
				new RenderModal(this, preset[1].key, preset[1].append).open()
			}})
		}
	}
	
	onunload() {
		this.eta.unload()
		console.log('Skribi: Unloading...', this.children);  
		Array.from(this.children).forEach((child) => {child.collapse()})
		document.body.removeClass(CLS.anim)
		document.querySelectorAll("body div.skribi-modal").forEach(v => v.addClass('skribi-unloaded'))
	}

	async initData() {
		this.data = Object.assign({}, await this.loadData());
		this.settings = this.data.settings = Object.assign({}, DEFAULT_SETTINGS, this.data.settings)
		return this.writeData();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async writeData() {return this.saveData(this.data)}
	async saveSettings() {return this.writeData();}
}

function findPresetCommands(plugin: SkribosPlugin) {
	let commands = plugin.app.commands.listCommands()
	let presetCommands = commands.filter((co) => co.id.startsWith('obsidian-skribi:render-preset_'))
	return presetCommands
}

export type renderModalPreset = {
  index: number // order in list
  name: string
  key: string
  append: string
  arguments?: Stringdex<string>
}

export interface PluginData {
  settings: SkribosSettings;
  renderModalPresets?: Stringdex<renderModalPreset>
}