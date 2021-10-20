/*
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

/* 
 * Modified from https://github.com/samthor/scoped (polyfill for deprecated HTML feature scoped styles)
 */

/** Prefixes all CSS selectors in a selector text string with prefix prefix */
export function prefixSelectors(selectorText: string, prefix: string) {
	const found = [];

	while (selectorText) {
		const consumed = consumeSelector(selectorText, prefix);
		if (consumed === null) {
			return ':not(*)';
		}
		found.push(consumed.selector);
		selectorText = consumed.rest;
	}

	return found.join(', ');
}

// This monstrosity matches any valid `[foo="bar"]` block, with either quote style. Parenthesis
// have no special meaning within an attribute selector, and the complex regexp below mostly
// exists to allow \" or \' in string parts (e.g. `[foo="b\"ar"]`).
const attrRe = /^\[.*?(?:(["'])(?:.|\\\1)*\1.*)*\]/;
const walkSelectorRe = /([([,]|:scope\b)/;  // "interesting" setups
const scopeRe = /^:scope\b/;

/**
 * Consumes a single selector from candidate selector text, which may contain many. */
export function consumeSelector(raw: string, prefix: string): {selector: string, rest: string} | null  {
    let i = raw.search(walkSelectorRe);
    if (i === -1) {
      return { selector: `${prefix} ${raw}`, rest: ''}
    } else if (raw[i] === ',') {
      return { selector: `${prefix} ${raw.substr(0, i)}`, rest: raw.substr(i + 1) }
    }

    let leftmost = true;   // whether we're past a descendant or similar selector
    let scope = false;     // whether :scope has been found + replaced
    i = raw.search(/\S/);  // place i after initial whitespace only

    let depth = 0;
		
  	outer:
    for (; i < raw.length; ++i) {
      const char = raw[i];
      switch (char) {
        case '[':
          const match = attrRe.exec(raw.substr(i));
          i += (match ? match[0].length : 1) - 1;  // we add 1 every loop
          continue;

        case '(':
          ++depth;
          continue;

        case ':':
          if (!leftmost) {
            continue;  // doesn't matter if :scope is here, it'll always be ignored
          } else if (!scopeRe.test(raw.substr(i))) {
            continue;  // not ':scope', ignore
          } else if (depth) {
            return null;
          }

          // Replace ':scope' with our prefix. This can happen many times; ':scope:scope' is valid.
          // It will never apply to a descendant selector (e.g., ".foo :scope") as this is ignored
          // by browsers anyway (invalid).
          raw = raw.substring(0, i) + prefix + raw.substr(i + 6);
          i += prefix.length;
          scope = true;
          --i;  // we'd skip over next character otherwise
          continue;  // run loop again

      case ')':
        if (depth) {--depth}
        continue;
    }
    if (depth) { continue }

    switch (char) {
      case ',':
        break outer;

      case ' ':
      case '>':
      case '~':
      case '+':
        if (!leftmost) {continue}
        leftmost = false;
    }
  }

  const selector = (scope ? '' : `${prefix} `) + raw.substr(0, i);
  return {selector, rest: raw.substr(i + 1)};
}