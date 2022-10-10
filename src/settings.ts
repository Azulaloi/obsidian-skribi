import { PluginSettingTab, App, Setting, TextAreaComponent, ToggleComponent, debounce } from "obsidian";
import { l } from "./lang/babel";
import SkribosPlugin, { renderModalPreset } from "./main";
import { addDocsButton, confirmationModal, makeExternalLink } from "./modal/modal-confirmation";
import { IndexScriptModal } from "./modal/modal-index-script";
import { IndexTemplateModal } from "./modal/modal-index-template";
import RenderModal from "./modal/modal-render";
import { TemplateSuggestAlt } from "./suggest";
import { CLS, PartialState } from "./types/const";
import { Collapsible, wrapCollapse } from "./util/interface";
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

	saveSetting = debounce(async (setting: keyof SkribosSettings, value: string | number | boolean, cb?: Function, ...args: any[]) => {
		// console.log("saving: " + setting + " = " + value)
		this.plugin.settings[setting] = value;
		this.plugin.saveSettings().then(() => {if (isExtant(cb) && isFunc(cb)) cb(...args || null)})
	}, 2000, true)

	saveData = debounce(async (cb?: Function, ...args: any[]) => {
		this.plugin.saveSettings().then(() => {if (isExtant(cb) && isFunc(cb)) cb(...args || null)})
	}, 1000, true)

	display(id?: string, sel?: [number, number]): void {
		let {containerEl} = this; // not sure what this is doing or why I did it
 
		containerEl.addClass("skribi-settings");
		containerEl.empty();
		containerEl.createEl('h2', {text: l["setting.title"]});
		
    let desc = containerEl.createDiv({cls: 'skribi-modal-desc', attr: {style: "margin-bottom: 1em;"}})
    makeExternalLink(desc.createEl('a', {text: l['documentation'], attr: {'href': linkDocs('settings')}}))
		desc.createEl('br'), desc.createEl('br')

		/* Index Buttons */

		const ist = desc.createSpan({text: `Template Index`, cls: 'skr-button'})
		ist.addEventListener('click', (ev) => {
			ev.preventDefault()
			let p = new IndexTemplateModal(this.app.plugins.plugins["obsidian-skribi"])
			p.open()
		})

		const iss = desc.createSpan({text: `Script Index`, cls: 'skr-button'})
		iss.addEventListener('click', (ev) => {
			ev.preventDefault()
			let p = new IndexScriptModal(this.app.plugins.plugins["obsidian-skribi"])
			p.open()
		})

		/* Settings*/

		const tdir = new Setting(containerEl)
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
		// addDocsButton(tdir.nameEl, "settings/#template-directory")

		const sdir = new Setting(containerEl)
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
		// addDocsButton(sdir.nameEl, "settings/#script-folder")

		this.makeToggle(containerEl, "autoReload", l["setting.autoReload.name"], l["setting.autoReload.desc"])
		this.makeToggle(containerEl, "errorLogging", l["setting.errorLog.name"], l["setting.errorLog.desc"])
		this.makeToggle(containerEl, "verboseLogging", l["setting.verbose.name"], l["setting.verbose.desc"])
		this.makeToggle(containerEl, "templateSuggest", l["setting.templateSuggest.name"], l["setting.templateSuggest.desc"])
		this.makeToggle(containerEl, "cssAnimations", l["setting.cssAnimations.name"], l["setting.cssAnimations.desc"], (val: boolean) => {
			document.body.toggleClass(CLS.anim, val)
		});
		// this.makeToggle(containerEl, "shadowMode", "Shadow Mode", "Embed skribis in a shadow root", () => invokeMethodOf<SkribiChild>("rerender", ...this.plugin.children)) // hidden for now (this kills the skribichild)
	
		this.composePresetList(containerEl)
		this.containerEl.createSpan({cls: 'skribi-modal-version-number', text: `SkribosPlugin ${this.app.plugins.plugins["obsidian-skribi"].manifest.version}`})
	}

	private makeToggle(el: HTMLElement, setting: keyof SkribosSettings, name: string, desc: string, cb?: (value: any) => void, docAddress?: string) {
		const set = new Setting(el)
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

		if (isExtant(docAddress)) addDocsButton(set.nameEl, docAddress);
		return set 
	}

	//TODO: move this to a preset index modal? maybe
	private composePresetList(containerEl: HTMLElement ) {
		let presetsDiv = containerEl.createDiv({cls: 'skribi-presets-list'});
		let col = wrapCollapse(presetsDiv, this.collapsedEls.renderPresets, (state) => this.collapsedEls.renderPresets = state)
		col.collapseEl.addClass('skribi-presets-settings')
		let keyField = new Setting(col.collapseTitleEl)
			.setName(l['setting.presets.name'])
			.addButton((button) => { button
				.setButtonText("+")
				.setTooltip(l['setting.presets.newTooltip'])
				.onClick(() => {
					/* Create a new, blank preset and display it */
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
		addDocsButton(keyField.nameEl, "misc/render_modal")

		presetsDiv.createDiv({cls: 'skribi-presets-list-header'}, (div) => {
			div.createSpan({text: l['setting.presets.labelName']})
			div.createSpan({text: l['setting.presets.labelTemplate']})
			div.createSpan({text: l['setting.presets.labelArguments']})
		});
		let entries = Object.entries(this.plugin.data?.renderModalPresets ?? {}) as [string, renderModalPreset][]
		entries.sort((a, b) => a[1].index - b[1].index).forEach((preset, index) => {
			this.createPresetEntry(presetsDiv, index, preset[0], preset[1], col)
		})
	}

	// TODO: add a test/render button that just executes the preset
	createPresetEntry(el: HTMLElement, index: number, uid: string, preset: renderModalPreset, col: Collapsible) {
		const set = new Setting(el)
		set.settingEl.addClass('skribi-preset-entry')

		const observer = new ResizeObserver((entries) => {
			/* Alert the list's collapsible container that the content size has changed 
			If there are more than one entries, the collapsible is toggling, so don't interfere */
			entries.length > 1 || col.updateSize()
		})

		/* Preset key */
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
			text.inputEl.rows = 1;
			addMinHeightListener(text.inputEl)
			observer.observe(text.inputEl)
		})

		//TODO: recheck key validity when templatecache is updated? definitely overkill

		/* This is seperate so that it can be called from the PopoverSuggest */
		const onchange = (val: string, text: TextAreaComponent) => {
			if (val.length > 0) {
				let state = this.plugin.handler.checkTemplate(val)
				if (state == PartialState.LOADED) {
					text.inputEl.removeClass("skr-absent", "skr-failed")
					text.inputEl.title = ""
				} else if (state == PartialState.FAILED) {
					text.inputEl.toggleClass("skr-failed", true)
					text.inputEl.removeClass("skr-absent")
					text.inputEl.title = l._('setting.presets.templateFailedTooltip', val)
				} else if (state == PartialState.ABSENT) {
					text.inputEl.toggleClass("skr-absent", true)
					text.inputEl.removeClass("skr-failed")
					text.inputEl.title = l._('setting.presets.templateAbsentTooltip', val)
				}
			}

			this.plugin.data.renderModalPresets[uid].key = val
			this.saveData()
		}

		/* Template key */
		set.addTextArea((text) => {
			text.setValue(preset?.key ?? this.plugin.data.renderModalPresets[uid].key)
			text.onChange(val => onchange(val, text))
			new TemplateSuggestAlt(this.plugin, text, onchange)
			text.inputEl.rows = 1
			addMinHeightListener(text.inputEl)
			observer.observe(text.inputEl)
		})

		/* Arguments */
		set.addTextArea((text) => {
			text.setValue(preset?.append ?? this.plugin.data.renderModalPresets[uid].append)
			text.onChange(val => {
				this.plugin.data.renderModalPresets[uid].append = val
				this.saveData()
			})
			text.inputEl.rows = 1;
			addMinHeightListener(text.inputEl)
			observer.observe(text.inputEl)
		})

		/* Button to open preset */
		set.addButton((button) => {let b = button
			.setTooltip(l['setting.presets.renderTooltip'])
			.onClick(async () => {
				new RenderModal(this.plugin, this.plugin.data.renderModalPresets[uid].key, this.plugin.data.renderModalPresets[uid].append).open()
			})
			.setIcon('run-command')
			return b
		})

		/* Button to delete preset */
		set.addButton((button) => { let b = button
			.setIcon('trash')
			.setTooltip(l['setting.presets.deleteTooltip'])
			.onClick(async () => {
				let p = new confirmationModal(this.app, {title: l['setting.presets.deleteConfirm'], class: "skribi-aposema"});
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
			b.buttonEl.addClass("skribi-aposema")
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

function addMinHeightListener(el: HTMLTextAreaElement): void {
	el.addEventListener("mouseover", (e) => {
		if (!el.hasAttribute("style")) {
			// not sure where the extra 2 pixels come from, but this is what works
			el.setAttribute("style", `min-height: ${el.clientHeight + 2}px;`)
		}
	}, {"once": true});
}