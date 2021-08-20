import { PluginSettingTab, App, Setting, TextAreaComponent } from "obsidian";
import SkribosPlugin from "./main";

export class SkribosSettingTab extends PluginSettingTab {
	plugin: SkribosPlugin;

	constructor(app: App, plugin: SkribosPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Skribos Settings'});

		new Setting(containerEl)
			.setName('Template Directory')
			.setDesc('Eta will look for templates in this folder.')
			.addTextArea((text: TextAreaComponent) => text
				.setValue(this.plugin.settings.templateFolder)
				.onChange(async (value) => {
					this.plugin.settings.templateFolder = value;
					await this.plugin.saveSettings();
				}));	
	}
}

export interface SkribosSettings {
	templateFolder: string;
}

export const DEFAULT_SETTINGS: SkribosSettings = {
	templateFolder: "",
}