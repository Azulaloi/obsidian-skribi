import { PluginSettingTab, App, Setting, TextAreaComponent, ToggleComponent, debounce } from "obsidian";
import { renderModalPreset } from "./data/data";
import { l } from "./lang/babel";
import SkribosPlugin from "./main";
import { makeExternalLink } from "./modal/confirmationModal";
import { CLS } from "./types/const";
import { wrapCollapse } from "./util/interface";
import { isExtant, isFunc, linkDocs } from "./util/util";

export class SkribosSettingTab extends PluginSettingTab {
	plugin: SkribosPlugin;

	collapsedEls = {
		renderPresets: false
	}

	constructor(app: App, plugin: SkribosPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;
 
		containerEl.addClass("skribi-settings");
		containerEl.empty();
		containerEl.createEl('h2', {text: l["setting.title"]});
		
    let desc = containerEl.createDiv({cls: 'skribi-modal-desc', attr: {style: "margin-bottom: 1em;"}})
    makeExternalLink(desc.createEl('a', {text: l['documentation'], attr: {'href': linkDocs('settings')}}))

		new Setting(containerEl)
			.setName(l["setting.templateDirectory.name"])
			.setDesc(l["setting.templateDirectory.desc"])
			.addTextArea((text: TextAreaComponent) => {text
				.setValue(this.plugin.settings.templateFolder)
				.onChange(async (value) => {
					let previous = this.plugin.settings.templateFolder
					this.saveSetting('templateFolder', value, () => {
						if (previous !== value) this.plugin.eta.loader.directoryChanged();
					})
				}); text.inputEl.cols = 30; return text});

		new Setting(containerEl)
			.setName(l["setting.scriptDirectory.name"])
			.setDesc(l["setting.scriptDirectory.desc"])
			.addTextArea((text: TextAreaComponent) => {text
				.setValue(this.plugin.settings.scriptFolder)
				.onChange(async (value) => {
					let previous = this.plugin.settings.scriptFolder
					this.saveSetting('scriptFolder', value, () => {
						if (previous !== value) this.plugin.eta.bus.scriptLoader.directoryChanged();
					})
				}); text.inputEl.cols = 30; return text});

		this.makeToggle(containerEl, "autoReload", l["setting.autoReload.name"], l["setting.autoReload.desc"])
		this.makeToggle(containerEl, "errorLogging", l["setting.errorLog.name"], l["setting.errorLog.desc"])
		this.makeToggle(containerEl, "verboseLogging", l["setting.verbose.name"], l["setting.verbose.desc"])
		this.makeToggle(containerEl, "templateSuggest", l["setting.templateSuggest.name"], l["setting.templateSuggest.desc"])
		this.makeToggle(containerEl, "cssAnimations", l["setting.cssAnimations.name"], l["setting.cssAnimations.desc"], (val: boolean) => {
			document.body.toggleClass(CLS.anim, val)
		});

		// this.makeToggle(containerEl, "shadowMode", "Shadow Mode", "Embed skribis in a shadow root", () => invokeMethodOf<SkribiChild>("rerender", ...this.plugin.children)) // hidden for now (this kills the skribichild)
	
		let presetsDiv = containerEl.createDiv({cls: 'skribi-presets-list'});
		let col = wrapCollapse(presetsDiv, this.collapsedEls.renderPresets, (state) => this.collapsedEls.renderPresets = state)
		col.collapseTitleTextEl.setText('Render Command Presets')
		;(Object.entries(this.plugin.data.renderModalPresets) as [string, renderModalPreset][]).forEach((preset) => {
			// let set = new Setting(presetsDiv)
			// set.settingEl.addClass('skribi-preset-entry')
			this.createPresetEntry(presetsDiv, preset[0], preset[1])
		})
	}

	private makeToggle(el: HTMLElement, setting: keyof SkribosSettings, name: string, desc: string, cb?: (value: any) => void) {
		return new Setting(el)
		.setName(name)
		.setDesc(desc)
		.addToggle((toggle: ToggleComponent) => { toggle
			.setValue(!!this.plugin.settings[setting])
			.onChange(async (value) => {
				this.plugin.settings[setting] = value;
				await this.plugin.saveSettings();
				if (cb) cb(value);
			})
		})
	}

	saveSetting = debounce(async (setting: keyof SkribosSettings, value: string | number | boolean, cb?: Function, ...args: any[]) => {
		// console.log("saving: " + setting + " = " + value)
		this.plugin.settings[setting] = value;
		this.plugin.saveSettings().then(() => {if (isExtant(cb) && isFunc(cb)) cb(...args || null)})
	}, 2000, true)

	createPresetEntry(el: HTMLElement, key: string, preset: renderModalPreset) {
		let pel = el.createDiv({cls: 'skribi-preset-entry'})
		let pcol = wrapCollapse(pel)

		let keyField = new Setting(pcol.collapseTitleEl)
		keyField.settingEl.addClass('skribi-preset-key')
		keyField.addTextArea((text) => {
			var prevKey = key
			text.setValue(key)
			text.onChange(async (value) => {
				let p = this.plugin.data.renderModalPresets[key]
				delete this.plugin.data.renderModalPresets[key]
				this.plugin.data.renderModalPresets[value] = p
				await this.plugin.saveSettings();
				this.display()
			})
			text.inputEl.cols = 12;
			text.inputEl.rows = 1;
		})

		for (let v of Object.entries(preset.arguments)) {
			let argSet = new Setting(pel)
			this.ruleTextField(argSet, key, v)
		}
	}

	ruleTextField(set: Setting, presetKey: string, val: [string, string])  {
		set.addTextArea((text) => { 
			/* Property Key */	
			// let i = this.plugin.data.hoistRules.indexOf(r)
			var prevKey = val[0];

			text.setValue(val[0])
			text.onChange(async (value) => {
				let p = this.plugin.data.renderModalPresets[presetKey].arguments
				p[value] = p[prevKey]
				delete p[prevKey]
				this.plugin.data.renderModalPresets[presetKey].arguments = p
				await this.plugin.saveSettings();
				prevKey = this.plugin.data.renderModalPresets[presetKey].arguments[value]
				this.display()
			})
			// text.inputEl.rows = 1;
			text.inputEl.cols = 12;
			text.inputEl.addClass("skr-preset-propkey")
		})

		/* Property Value */
		set.addTextArea((text) => {
			text.setValue(val[1])
			text.onChange(async (value) => {
				this.plugin.data.renderModalPresets[presetKey].arguments[val[0]] = value
				await this.plugin.saveSettings();
				this.display()
			})
		})
}
}

export interface SkribosSettings {
	[key: string] : boolean | string | string[] | number;

	templateFolder: string;
	scriptFolder: string;
	verboseLogging: boolean;
	devLogging: boolean;
	errorLogging: boolean;
	autoReload: boolean;
	templateSuggest: boolean;
	cssAnimations: boolean;

	/* unlisted */
	reflectStyleTagText: boolean;
	shadowMode: boolean;
}

export const DEFAULT_SETTINGS: SkribosSettings = {
	templateFolder: "",
	scriptFolder: "",
	verboseLogging: false,
	devLogging: false,
	errorLogging: false,
	autoReload: true,
	templateSuggest: true,
	cssAnimations: true,
	
	reflectStyleTagText: true,
	shadowMode: false,
}