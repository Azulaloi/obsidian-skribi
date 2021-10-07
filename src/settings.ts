import { PluginSettingTab, App, Setting, TextAreaComponent, ToggleComponent, debounce } from "obsidian";
import { l } from "./lang/babel";
import SkribosPlugin from "./main";
import { isExtant, isFunc } from "./util";

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

		new Setting(containerEl)
			.setName(l["setting.errorLog.name"])
			.setDesc(l["setting.errorLog.desc"])
			.addToggle((toggle: ToggleComponent) => { toggle
				.setValue(this.plugin.settings.errorLogging)
				.onChange(async (value) => {
					this.plugin.settings.errorLogging = value;
					await this.plugin.saveSettings();
				})});

		new Setting(containerEl)
			.setName(l["setting.verbose.name"])
			.setDesc(l["setting.verbose.desc"])
			.addToggle((toggle: ToggleComponent) => { toggle
				.setValue(this.plugin.settings.verboseLogging)
				.onChange(async (value) => {
					this.plugin.settings.verboseLogging = value;
					await this.plugin.saveSettings();
				})});
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
}

export const DEFAULT_SETTINGS: SkribosSettings = {
	templateFolder: "",
	scriptFolder: "",
	verboseLogging: false,
	devLogging: false,
	errorLogging: false,
}