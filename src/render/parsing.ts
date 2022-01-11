import { isExtant } from "src/util/util";

/** Checks a codeblock for skribi invocation and invocation type */
export async function preparseSkribi(el: HTMLElement, str?: string, flg?: any) {
	let text = isExtant(str) ? str : el.textContent
	if (text.length < 3) return;

	let e = text.substr(text.length-2)
	let s = text.substr(0, 2)
	
	if (s.startsWith("{") && e.endsWith("}")) {
		let f = s[1];
		let flag = (f == ":") ? 1 : (f == "=") ? 2 : (f == "~") ? 3 : (f == "{") ? 4 : (f == ".") ? 5 : -1;
		if ((flag > 0) && (flag != 4 || (e == "}}"))) {
			return {flag: flag, text: text.substring(2, text.length - (flag == 4 ? 2 : 1 ))}
		} else return
	} else return
}

/** Parse variables in template invocations */
export async function parseSkribi(src: string): Promise<{
	id: string,
	args: any
}> {
	let sa = src.split(/(?<![\\])\|/)
	let id = sa.splice(0, 1)[0].trim()

	let args: Record<string, string> = {};
	for (let seg of sa) {
		let si = seg.indexOf(":")
		if (si == -1) continue;
		args[seg.slice(0, si).trim()] = seg.slice(si+1).trim();
	}

	return {id: id, args: {v: args}};
}