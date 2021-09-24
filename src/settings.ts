import { PluginSettingTab, App, Setting, TextAreaComponent, ToggleComponent, debounce } from "obsidian";
import SkribosPlugin from "./main";
import { isExtant, isFile, isFunc } from "./util";

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
		containerEl.createEl('h2', {text: 'Skribi Settings'});

		new Setting(containerEl)
			.setName('Template Directory')
			.setDesc('Skribi will look for templates in this folder.')
			.addTextArea((text: TextAreaComponent) => {text
				.setValue(this.plugin.settings.templateFolder)
				.onChange(async (value) => {
					this.plugin.settings.templateFolder = value;
					await this.plugin.saveSettings();
				}); text.inputEl.cols = 30; return text});

		new Setting(containerEl)
			.setName('Skript Directory')
			.setDesc('Skribi will look for JS files in this folder.')
			.addTextArea((text: TextAreaComponent) => {text
				.setValue(this.plugin.settings.scriptFolder)
				.onChange(async (value) => {
					this.saveSetting('scriptFolder', value, () => this.plugin.eta.bus.scriptLoader.directoryChanged())
				}); text.inputEl.cols = 30; return text});

		new Setting(containerEl)
			.setName('Error Logging')
			.setDesc('Enable to dump any errored renders to the console.' 
			+ 'If false, will still add the error as tooltip on the errored element. \n' 
			+ 'Will spam your console if typing into a skribi with a preview window open.')
			.addToggle((toggle: ToggleComponent) => { toggle
				.setValue(this.plugin.settings.errorLogging)
				.onChange(async (value) => {
					this.plugin.settings.errorLogging = value;
					await this.plugin.saveSettings();
				})});

		new Setting(containerEl)
			.setName('Verbose Logging')
			.setDesc('Enable to get more detailed logs in the console.')
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