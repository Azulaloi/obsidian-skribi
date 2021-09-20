# Skribi

**Warning**: this plugin is not yet released, and may be subject to breaking changes (such as syntax alterations).

Skribi implements [Eta](https://eta.js.org/) templating in [Obsidian](https://obsidian.md/) in a manner akin to [Scribunto](https://www.mediawiki.org/wiki/Extension:Scribunto), the scripted template framework used by MediaWiki. Create a template, pass variables to it, and render the output in your notes.

Skribi enables **non-destructive** templating: seamlessly integrate complex HTML into your notes, instanced from a single source, without HTML clutter or having to repeat yourself. You can even construct normally impossible element structures, such as rendering markdown inside of block elements - including Obsidian syntax media embedding. Inside a skribi, you have access to Eta's powerful templating tools and javascript, letting you imbue your template objects with dynamic behaviours.

<img style="width: 60%;" src="https://i.imgur.com/t3i7WZg.png" />

See below for examples, or visit the [Documentation](https://azulaloi.net/obsidian-skribi/) for more detailed info.

## Usage Details

Skribi recognizes inline code elements with curly brackets `{}` and codeblocks of type `skribi`. The contents are processed with Eta, and the output is rendered in place of the code element. The output is updated automatically as you make changes. These render very quickly - without any scripting that causes a delay (like file reads), skribi render times are practically instant. Because they are rendered asynchronously, many skribis can be placed in a document without delaying a note's rendering.

Skribi has two primary modes: template and non-template. Templates are loaded from files in the configured template folder, and invoked with a colon. They may then be followed by pipe-separated values. Note that any pipes in the values must be escaped. Here is a simple example of a template, invoking the template, and its output in preview mode.

<img style="width: 30%;" src="https://i.imgur.com/RsMl56L.png"/>

Non-template skribis are simply processed directly by Eta. `{= ... }` is sent to Eta as `<%= ... %>`, `{~ ... }` as `<%~ ... %>`, and `{{ ... }}` as `...`.

After being rendered by Eta, the output is rendered to markdown. They are also processed for embeds, meaning that you may use obsidian syntax to insert images or even transclusions from within Eta. Any span with the class `media-embed` but without `is-loaded` will have its embeds repaired. For technical reasons, this is done by the Skribi post-processor, rather than the Obsidian one, so it may have certain discrepancies (but I'll try and fix them - transclusions need to be re-rendered to update to file changes, rather than updating live like normal transclusions, and also block (#header) transclusions don't work yet). 

Skribis inside of transclusions are processed as well. You may even invoke a skribi from within a skribi (to a depth of 5).

## Planned Features

- More utility functions (like printing html objects from js)
- Ways to pass values in other formats (rest, arrays, anonymous, etc)
- Options for how the elements are output (turning off the container divs and suppressing the rendermarkdown fluff, for example)
- Function to export a skribi as an HTML string
- Recursion limit setting (currently locked to 5)
- Syntax highlighting (maybe)
  
## Why "Skribi"?

Skribi means 'write' in Esperanto, which is the origin of Eta's name, which means 'tiny'. Scribunto means 'they will write' in Latin. "Skribos" is a more accurate translation, but I think Skribi sounds better (pronounced 'skree-bee').
