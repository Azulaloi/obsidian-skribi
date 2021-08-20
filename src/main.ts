import { App, MarkdownPostProcessor, MarkdownPostProcessorContext, MarkdownPreviewRenderer, MarkdownRenderer, Modal, normalizePath, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, Vault } from 'obsidian';
import { EtaHandler } from './eta';
import { DEFAULT_SETTINGS, SkribosSettings, SkribosSettingTab } from './settings';

interface Template {
	file: TFile
}

export default class SkribosPlugin extends Plugin {
	settings: SkribosSettings;
	eta: EtaHandler;
	templates: Map<string, Template>;

	public etaprocessor: MarkdownPostProcessor = async (
		doc: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) => {
		const elCodes = doc.querySelectorAll("code")
		if (elCodes) {
			let {lit: lit, interp: interp, temp: temp} = checkCodes(elCodes)

			for (let key of lit.keys())
				lit.set(key, this.eta.render(lit.get(key)));

			for (let key of interp.keys())
				interp.set(key, (this.eta.render("<%=" + interp.get(key) + "%>")));

			for (let key of temp.keys()) {
				let sa = temp.get(key).split(/(?<![\\])\|(?![\&])/)
				let id = sa.splice(0, 1)[0].trim()
				if (!this.templates.has(id)) continue;
				// let args: {id: string, val?: string}[] = [] 
				let args: Record<string, string> = {};

				// console.log(key)
				for (let seg of sa) {
					let s: string[] = []
					let si = seg.indexOf(":")

					// s = (si == -1) ? [seg] : [seg.slice(0, si), seg.slice(si+1)];
					// let ret: {id: string, val?: string}  = {id: s[0]}
					// if (s[1]) ret["val"] = s[1]
					if (si == -1) continue;
					args[seg.slice(0, si).trim()] = seg.slice(si+1).trim();
				
					// args.push({id: seg.slice(0, si), val:  })
				}


				console.log(args)

				let template = await this.app.vault.read(this.templates.get(id).file)
				if (!template) continue;

				temp.set(key, this.eta.render(template, args))
			}

			for (let key of temp.keys()) {
				let e = createDiv()
				MarkdownRenderer.renderMarkdown(temp.get(key), e, ctx.sourcePath, null)
				const mke: ChildNode[] = Array.from(e?.childNodes || []);
				key.replaceWith(...mke)
			}
			
			// for (let key of interp.keys()) {
			// 	let e = createDiv()
			// 	MarkdownRenderer.renderMarkdown(interp.get(key), e, ctx.sourcePath, null)
				
			// 	const mke: ChildNode[] = Array.from(e?.childNodes || []);
				
			// 	let e2 = e.cloneNode(true)
			// 	const mk2: ChildNode[] = Array.from(e2?.childNodes || []);

			// 	// let set: Map<ChildNode, ChildNode> = new Map();
			// 	const s = mke.length

			// 	let set: [ChildNode, ChildNode | ChildNode[]][] = [];
			// 	for (let i = 0; i < s; i++) {
			// 		// set.set(mke[i], mk2[i])
			// 		set[i] = [mke[i], mk2[i]]
			// 	}

			// 	for (let i = 0; i < mke.length; i++) {
			// 		if (mke[i].nodeName == "P"
			// 		&& mke[i].hasChildNodes) {
			// 			console.log(set)
			// 			mk2.splice(mk2.indexOf(mke[i]), 1, ...Array.from(mke[i].childNodes))
			// 			// set[i][1] = Array.from(set[i][0].childNodes).splice
			// 			// mk2[i].replaceWith(...Array.from(set.get(mke[i])?.childNodes || []))
			// 		}
			// 	}
			// 	console.log(mke)
			// 	console.log(mk2)

			// 	// pretty sure this is stupid but its really late so...

			// 	// key.replaceWith(...mk2)
			// 	// key.replaceWith(...(set.map((v) => {
			// 		// return v[1];
			// 		// ((v[1] Array) ? : v[1])
			// 	// })));
			// 	key.replaceWith(...mk2)
			// }
		}
	}
	async onload() {
		console.log('Loading Skribos...');

		await this.loadSettings();
		this.addSettingTab(new SkribosSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {this.loadTemplates();})
		this.eta = new EtaHandler(this.app, this);

		MarkdownPreviewRenderer.registerPostProcessor(this.etaprocessor)
	}

	onunload() {
		console.log('Unloading Skribos...');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async loadTemplates(): Promise<void> {
		let files = getFiles(this.app, this.settings.templateFolder)
		let set: Map<string, Template> = new Map();

		for (let f of files) {
			set.set(f.basename, {file: f})
		}

		this.templates = set;
	}
}


function getFiles(app: App, dir: string): TFile[] {
	let dirPath = normalizePath(dir)
	let fo = app.vault.getAbstractFileByPath(dirPath);

	// console.log(dirPath), console.log(fo);
	if (!fo || !(fo instanceof TFolder)) throw "bronk";

	let files: TFile[] = [];
	Vault.recurseChildren(fo, (fi) => {
		if (fi instanceof TFile) files.push(fi)
	})

	return files;
}

function checkCodes(blocks: NodeListOf<Element>) {
	let setInterp: Map<ChildNode, string> = new Map();
	let setTemplate: Map<ChildNode, string> = new Map();
	let setLiteral: Map<ChildNode, string> = new Map();

	blocks.forEach(function(block: ChildNode) {
		let text = block.textContent
		if (text.length < 3) return;

		let e = text.substr(text.length-2)
		let s = text.substr(0, 2)
		
		if (s.startsWith("{") && e.endsWith("}")) {
			if (s[1] == ":") { setTemplate.set(block, text.substring(2, text.length-1))}
		  else if (s[1] == "=") {setInterp.set(block, text.substring(2, text.length-1))}
			else if ((s == "{{") && (e == "}}")) {
				setLiteral.set(block, text.substring(2, text.length-2))
			}

			// return text.substring(2, text.length-2)
			// set.set(block, text.substring(2, text.length-2))
			
			// block.replaceWith(ipa)
		}
	})

	return {interp: setInterp, temp: setTemplate, lit: setLiteral};
}