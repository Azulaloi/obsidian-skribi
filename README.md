# Skribi

This plugin implements [Eta](https://eta.js.org/) templating in [Obsidian](https://obsidian.md/) in a manner akin to [Scribunto](https://www.mediawiki.org/wiki/Extension:Scribunto), the scripted template framework used by MediaWiki.

Skribi is designed to enable non-destructive templating: seamlessly integrate complex HTML into your notes, instanced from a single source, without clutter or having to repeat yourself. You can even construct normally impossible element structures, such as rendering markdown inside of block elements - including Obsidian syntax media embedding. Inside a skribi, you have access to Eta's powerful templating tools and javascript, letting you imbue your template objects with dynamic behaviours.

<img style="width: 60%;" src="https://i.imgur.com/t3i7WZg.png" />

## Usage Details

Skribi recognizes inline code elements with curly brackets `{}` and codeblocks of type `skribi`. The contents are processed with Eta, and the output is rendered in place of the code element. The output is updated automatically as you make changes. These render very quickly - without any scripting that causes a delay (like file reads), skribi render times are practically instant. Because they are rendered asynchronously, many skribis can be placed in a document without delaying a note's rendering.

Skribi has two primary modes: template and non-template. Templates are loaded from files in the configured template folder, and invoked with a colon. They may then be followed by pipe-separated values. Note that any pipes in the values must be escaped. Here is a simple example of a template, using the template, and its output in preview mode.

<img style="width: 30%;" src="https://i.imgur.com/RsMl56L.png"/>

Non-template skribis are simply processed directly by Eta. `{= ... }` is sent to Eta as `<%= ... %>`, `{~ ... }` as `<%~ ... %>`, and `{{ ... }}` as `...`.

After being rendered by Eta, the output is rendered to markdown. They are also processed for embeds, meaning that you may use obsidian syntax to insert images or even transclusions from within Eta. Any span with the class `media-embed` but without `is-loaded` will have its embeds repaired. For technical reasons, this is done by the Skribi post-processor, rather than the Obsidian one, so it may have certain discrepancies (but I'll try and fix them) - for example, transclusions will need to be re-rendered to update to file changes, rather than updating live like normal transclusions. Skribis inside of transclusions are processed as well. You may even invoke a skribi from within a skribi (to a depth of 5).

I've also provided the utility function `sk.render()`, which takes a string, renders it to markdown, and outputs the HTML as text. Placing this within a raw tag (`<%~ %>` in a template or `{~ }` in a doc) will then render the HTML as elements (if it parses) - in interpolate tags you'll just get the escaped HTML as text. HTML in a template will already render like any other HTML written in a page, but this is useful to render markdown elements inside of block elements (which Obsidian will not process markdown inside of). For example, `<div> ![[<%=sk.v.imgpath%>]] </div>`  will render as a div with the text `![[imgpath]]`, but ``<div> <%~ sk.render(`![[${sk.v.imgpath}]]`)%> </div>`` will render as an image embed span with src `imgpath` inside the div. As an example of the `{{ }}` tags, you could achieve the same with ``{{ <div><%~sk.render(`![[${sk.v.imgpath}]]`)%></div> }}``. 

Because post processors are not applied to block-level elements, skribis instead of block level elements will not render, even if you create the code span with html. Inside of a rendered skribi, nested skribis will render inside of block elements, and may be created with ``sk.render("`{}`")`` or `<code>{ }</code>`, to a depth of 5 (will add a setting to increase limit later).

Note: the markdown renderer has a tendency to embed everything in `<p>`s and `<div>`s. I'm not sure the best way to deal with that yet, but it's not really a problem - just kind of clutters the DOM a bit. When styling your templates, make sure to use the inspector to see the actual structure of your rendered elements.

Also, the output is always placed in a div with the attribute `skribi`, with the value set to the name of the template. In CSS, you can target these with `div[skribi="name"]`. `div[skribi]` will select all skribis.

## State Indicators

Skribis may render with colors or icons to indicate their state.

- Original code but in green means that the skribi is loading. I've never actually seen this because they usually render before the page, but you might see it if your script takes longer than the page to render.

- Blue `SK` with a spinning circle-arrow means that the template being invoked has not yet been loaded. It will be replaced once the template is loaded and rendered. This happens briefly if there are skribis on first page after launching Obsidian.

- Red `SK` with an exclamation mark means there was an error. Hover over it to see the error message. This will happen if Eta parsing fails, for example, or if a non-existant template is invoked.

- Original code but in light blue means that the skribi was not rendered because it hit the recursion limit. 
- An empty div with a spinning spiral is rendered in the place of an embed when the depth limit is reached. 
- Original code but in orange means that the skribi was not rendered because it is invoking itself (if you want this behaviour for some reason let me know and I'll add an option for it).

## Settings

- **Template Folder**

Files in this folder are loaded as templates.

- **Verbose Logging**

Provides (a lot of) additional information in the console.

Results from each processed block element and individual skribi is logged. Because postprocessors are called per-block, I can't get the total time (start first render to finish last render) for a document, unfortunately. At least, not easily enough to be worth implementing.

Note on parsing times: the times displayed are *not* consecutive, they're more or less all processed simultaneously. You can see that this is the case if you have several skribis in a single block - their individual logs might say 10ms each, but the block says it rendered all five of them in 20ms.

The block logs (the ones that say `Processed X skribis in element`) are inflated by 5-10ms or so because of the way I check the results. I'll try and fix that...

Also, the times inevitably vary somewhat each execution.

## Planned Features

- More utility functions (like printing html objects from js)
- Ways to pass values in other formats (rest, arrays, etc)
- Options for how the elements are output (turning off the container divs and suppressing the rendermarkdown fluff, for example)
- Function to export a skribi as an HTML string
- Recursion limit setting (currently locked to 5)
- Loading custom JS as modules (maybe)
- Syntax highlighting (maybe)
  
## Why "Skribi"?

Skribi means 'write' in Esperanto, which is the origin of Eta's name, which means 'tiny'. Scribunto means 'they will write' in Latin. "Skribos" is a more accurate translation, but I think Skribi sounds better (pronounced 'skree-bee').
