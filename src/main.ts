import { MarkdownView, Plugin } from 'obsidian';
import { EtaHandler } from './eta/eta';
import { DEFAULT_SETTINGS, SkribosSettings, SkribosSettingTab } from './settings';
import { SkribiChild } from './render/child';
import { SuggestionModal } from './modal/suggestionModal';
import { InsertionModal } from './modal/insertionModal';
import { TestModal } from './modal/testModal';
import { l } from './lang/babel';
import SkribiProcessor from './render/processor';

export default class SkribosPlugin extends Plugin {
	settings: SkribosSettings;
	eta: EtaHandler;
	processor: SkribiProcessor

	varName: string = "sk";
	initLoaded: boolean = false;

	l = l

	children: SkribiChild[] = []
	childProto: any = SkribiChild // for dev memory querying 

	async onload() {
		console.log('Skribi: Loading...');

		await this.loadSettings();
		this.addSettingTab(new SkribosSettingTab(this.app, this));

		this.eta = new EtaHandler(this)
		this.processor = new SkribiProcessor(this)

		this.processor.registerProcessors()
		this.registerEvent(this.app.workspace.on('skribi:template-init-complete', () => {
			this.initLoaded = true
			this.processor.templatesReady()
		}))

		this.defineCommands()
		this.registerExtensions(['eta'], 'markdown')
		// registerMirror(this);

		/* Rerender preview views */
		this.app.workspace.onLayoutReady(() => {
			this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
				if ((leaf.view as MarkdownView).currentMode.type == "preview") {
					(leaf.view as MarkdownView).previewMode.rerender(true)
				}
			})
		})
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
	}
	
	onunload() {
		this.eta.unload()
		console.log('Skribi: Unloading...', this.children);  
		Array.from(this.children).forEach((child) => {
			let pre = createEl('code', {text: child.source})
			child.containerEl.replaceWith(pre)
			child.unload()
		})
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}