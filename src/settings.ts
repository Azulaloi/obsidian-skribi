import { PluginSettingTab, App, Setting, TextAreaComponent, ToggleComponent, debounce } from "obsidian";
import { l } from "./lang/babel";
import SkribosPlugin, { renderModalPreset } from "./main";
import { confirmationModal, makeExternalLink } from "./modal/modal-confirmation";
import RenderModal from "./modal/modal-render";
import { CLS } from "./types/const";
import { wrapCollapse } from "./util/interface";
import { hash, isExtant, isFunc, linkDocs } from "./util/util";

export class SkribosSettingTab extends PluginSettingTab {
	plugin: SkribosPlugin;

	collapsedEls = {
		renderPresets: false
	}

	constructor(app: App, plugin: SkribosPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(id?: string, sel?: [number, number]): void {
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
						if (previous !== value) this.plugin.handler.loader.directoryChanged();
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
						if (previous !== value) this.plugin.handler.bus.scriptLoader.directoryChanged();
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
	
		/* PRESETS */
		let presetsDiv = containerEl.createDiv({cls: 'skribi-presets-list'});
		let col = wrapCollapse(presetsDiv, this.collapsedEls.renderPresets, (state) => this.collapsedEls.renderPresets = state)
		col.collapseEl.addClass('skribi-presets-settings')
		let keyField = new Setting(col.collapseTitleEl)
			.setName(l['setting.presets.name'])
			.addButton((button) => { button
				.setButtonText("+")
				.setTooltip(l['setting.presets.newTooltip'])
				.onClick(() => {
					this.plugin.data.renderModalPresets ??= {}

					let i = (Object.keys(this.plugin.data.renderModalPresets).length + 1)
					let newPreset = {
						index: i,
						name: l._('setting.presets.defaultPreset', i.toString()),
						key: "",
						append: ""	
					}
					
					const getUniqueKey: any = (iter: number) => {
						let t = window.performance.now().toString()
						let s = (t.length > 12) ? t.substring(t.length - 8) : t
						let x = hash(s)
						if (isExtant(this.plugin.data?.renderModalPresets?.[x])) {
							if (iter > 10) {throw "Could not generate ID, aborting"}
							return getUniqueKey(iter++)
						} else return x
					}

					let newKey = getUniqueKey(0)
					this.plugin.data.renderModalPresets[newKey] = newPreset
					this.plugin.saveSettings().then(() =>	{
						this.plugin.addCommand({id: `render-preset_${newKey}`, name: l._('command.renderPreset', newPreset.name), callback: () => {
							new RenderModal(this.plugin, this.plugin.data.renderModalPresets[newKey].key, this.plugin.data.renderModalPresets[newKey].append).open()
						}})
						this.display(newKey)
					})
				})
			});

		keyField.settingEl.prepend(col.collapseIndicator)

		presetsDiv.createDiv({cls: 'skribi-presets-list-label'}, (div) => {
			div.createSpan({cls: "skribi-presets-label-1", text: l['setting.presets.labelName']})
			div.createSpan({cls: "skribi-presets-label-2", text: l['setting.presets.labelTemplate']})
			div.createSpan({cls: "skribi-presets-label-3", text: l['setting.presets.labelArguments']})
		});
		let entries = Object.entries(this.plugin.data?.renderModalPresets ?? {}) as [string, renderModalPreset][]
		entries.sort((a, b) => a[1].index - b[1].index).forEach((preset, index) => {
			this.createPresetEntry(presetsDiv, index, preset[0], preset[1])
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

	saveData = debounce(async (cb?: Function, ...args: any[]) => {
		this.plugin.saveSettings().then(() => {if (isExtant(cb) && isFunc(cb)) cb(...args || null)})
	}, 1000, true)

	createPresetEntry(el: HTMLElement, index: number, uid: string, preset: renderModalPreset) {
		let set = new Setting(el)
		set.settingEl.addClass('skribi-preset-entry')

		/* Template Name */
		set.addTextArea((text) => {
			text.setValue(preset?.name ?? this.plugin.data.renderModalPresets[uid].name)
			text.onChange(val => {
				this.plugin.data.renderModalPresets[uid].name = val
				this.saveData(() => {
					this.app.commands.removeCommand(`obsidian-skribi:render-preset_${uid}`)
					this.plugin.addCommand({id: `render-preset_${uid}`, name: l._('command.renderPreset', val), callback: () => {
						new RenderModal(this.plugin, this.plugin.data.renderModalPresets[uid].key, this.plugin.data.renderModalPresets[uid].append).open()
					}})
				})
			})
			text.inputEl.cols = 12;
			text.inputEl.rows = 1;
		})

		/* Template Key */
		set.addTextArea((text) => {
			text.setValue(preset?.key ?? this.plugin.data.renderModalPresets[uid].key)
			text.onChange(val => {
				this.plugin.data.renderModalPresets[uid].key = val
				this.saveData()
			})
			text.inputEl.cols = 12;
			text.inputEl.rows = 1;
		})

		/* Append */
		set.addTextArea((text) => {
			text.setValue(preset?.append ?? this.plugin.data.renderModalPresets[uid].append)
			text.onChange(val => {
				this.plugin.data.renderModalPresets[uid].append = val
				this.saveData()
			})
			text.inputEl.rows = 1;
		})

		set.addButton((button) => { let b = button
			.setButtonText("X")
			.setTooltip(l['setting.presets.deleteTooltip'])
			.onClick(async () => {
				let p = new confirmationModal(this.app, {title: l['setting.presets.deleteConfirm']});
				new Promise((resolve: (value: string) => void, reject: (reason?: any) => void) => 
					p.openAndGetValue(resolve, reject))
						.then(ar =>  {
							if (ar === "true") {
								delete this.plugin.data.renderModalPresets[uid]
								this.plugin.saveSettings().then(() => {
									this.app.commands.removeCommand(`obsidian-skribi:render-preset_${uid}`)
									this.display()
								})
							}
					});
			})
			b.buttonEl.addClass("skribi-preset-delete")
			return b
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