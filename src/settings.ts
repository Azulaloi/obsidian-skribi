import { PluginSettingTab, App, Setting, TextAreaComponent, ToggleComponent, debounce } from "obsidian";
import { l } from "./lang/babel";
import SkribosPlugin from "./main";
import { makeExternalLink } from "./modal/confirmationModal";
import { CLS } from "./types/const";
import { isExtant, isFunc, linkDocs } from "./util/util";

export class SkribosSettingTab extends PluginSettingTab {
	plugin: SkribosPlugin;

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
					this.plugin.settings.templateFolder = value;
					await this.plugin.saveSettings();
				}); text.inputEl.cols = 30; return text});

		new Setting(containerEl)
			.setName(l["setting.scriptDirectory.name"])
			.setDesc(l["setting.scriptDirectory.desc"])
			.addTextArea((text: TextAreaComponent) => {text
				.setValue(this.plugin.settings.scriptFolder)
				.onChange(async (value) => {
					this.saveSetting('scriptFolder', value, () => this.plugin.eta.bus.scriptLoader.directoryChanged())
				}); text.inputEl.cols = 30; return text});

		this.makeToggle(containerEl, "autoReload", l["setting.autoReload.name"], l["setting.autoReload.desc"])
		this.makeToggle(containerEl, "errorLogging", l["setting.errorLog.name"], l["setting.errorLog.desc"])
		this.makeToggle(containerEl, "verboseLogging", l["setting.verbose.name"], l["setting.verbose.desc"])
		this.makeToggle(containerEl, "templateSuggest", l["setting.templateSuggest.name"], l["setting.templateSuggest.desc"])
		this.makeToggle(containerEl, "cssAnimations", l["setting.cssAnimations.name"], l["setting.cssAnimations.desc"], (val: boolean) => {
			document.body.toggleClass(CLS.anim, val)
		})

		// this.makeToggle(containerEl, "shadowMode", "Shadow Mode", "Embed skribis in a shadow root", () => invokeMethodOf<SkribiChild>("rerender", ...this.plugin.children)) // hidden for now (this kills the skribichild)
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

	saveSetting = debounce(async (setting: string, value: string | number | boolean, cb?: Function, ...args: any[]) => {
		// console.log("saving: " + setting + " = " + value)
		this.plugin.settings[setting] = value;
		this.plugin.saveSettings().then(() => {if (isExtant(cb) && isFunc(cb)) cb(...args || null)})
	}, 2000, true)
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