import './style/main.scss'
import { MarkdownView, Plugin } from 'obsidian';
import { EtaHandler } from './eta/eta';
import { DEFAULT_SETTINGS, SkribosSettings, SkribosSettingTab } from './settings';
import { SkribiChild } from './render/child';
import { SuggestionModal } from './modal/suggestionModal';
import { InsertionModal } from './modal/insertionModal';
import { TestModal } from './modal/testModal';
import { l } from './lang/babel';
import SkribiProcessor from './render/processor';
import TemplateSuggest from './suggest';
import { CLS } from './types/const';
import { around } from 'monkey-around';
import { IndexModal } from './modal/indexModal';
import RenderModal from './modal/renderModal';
import { PluginData, renderModalPreset } from './data/data';

export default class SkribosPlugin extends Plugin {
	data: PluginData
	settings: SkribosSettings
	
	eta: EtaHandler
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

		this.eta = new EtaHandler(this)
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
		// registerMirror(this);

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
	}

	/** Register our commands. */
	defineCommands() {
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

		this.addCommand({id: "reload-scripts", name: l['command.reloadScripts'], callback: () => {
			this.eta.bus.scriptLoader.reload().then(() => console.log("Skribi: Reloaded Scripts"));
		}})
		
		this.addCommand({id: "reload-skribis", name: "Reload Skribis", callback: () => {
			Array.from(this.children).forEach(child => child.rerender(child?.templateKey))
		}})

		this.addCommand({id: "test-performance", name: l['command.perfTest'], callback: async () => {
			let sel = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor?.getSelection()
			let clip = await window.navigator.clipboard.readText();
			let fill = (sel || clip) ? {
				type: l[sel ? 'modal.perf.autofill.selection' : 'modal.perf.autofill.clipboard'],
				value: sel ? sel : clip
			} : null
			
			new TestModal(this, fill).open()
		}})

		this.addCommand({id: "view-templates", name: "View Templates", callback: () => {
			new IndexModal(this).open()
		}})

		this.addCommand({id: "render-template", name: "Render Template", callback: () => {
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

		for (let preset of Object.entries(this.data.renderModalPresets) as [string, renderModalPreset][]) {
			this.addCommand({id: `render-preset_${preset[0]}`, name: `Render Preset - ${preset[1].name}`, callback: () => {
				new RenderModal(this, preset[1].key, preset[1].append).open()
			}})
		}
	}
	
	onunload() {
		this.eta.unload()
		console.log('Skribi: Unloading...', this.children);  
		Array.from(this.children).forEach((child) => {
			child.collapse()
		})
		document.body.removeClass(CLS.anim)
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