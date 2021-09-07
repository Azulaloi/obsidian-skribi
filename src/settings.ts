import { PluginSettingTab, App, Setting, TextAreaComponent, ToggleComponent } from "obsidian";
import SkribosPlugin from "./main";

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
			.addTextArea((text: TextAreaComponent) => text
				.setValue(this.plugin.settings.templateFolder)
				.onChange(async (value) => {
					this.plugin.settings.templateFolder = value;
					await this.plugin.saveSettings();
				}));

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
}

export interface SkribosSettings {
	templateFolder: string;
	verboseLogging: boolean;
	devLogging: boolean;
}

export const DEFAULT_SETTINGS: SkribosSettings = {
	templateFolder: "",
	verboseLogging: false,
	devLogging: false,
}