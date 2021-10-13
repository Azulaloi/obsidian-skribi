# Outline

Skribi implements [Eta](https://eta.js.org/) templating in [Obsidian](https://obsidian.md/) in a manner akin to [Scribunto](https://www.mediawiki.org/wiki/Extension:Scribunto), the scripted template framework used by MediaWiki. Create a template, pass variables to it, and render the output in your notes.

Skribi enables **non-destructive** templating: seamlessly integrate complex HTML into your notes, instanced from a single source, without HTML clutter or having to repeat yourself. You can even construct normally impossible element structures, such as rendering markdown inside of block elements - including Obsidian syntax media embedding. Inside a skribi, you have access to Eta's powerful templating tools and javascript, letting you imbue your template objects with dynamic behaviours.

## Usage Details

Skribi recognizes inline code elements with curly brackets `{}` and codeblocks of type `skribi`. The contents are processed with Eta, and the output is rendered in place of the code element. The output is updated automatically as you make changes. These render very quickly - without any scripting that causes a delay (like file reads), skribi render times are practically instant. Because they are rendered asynchronously, many skribis can be placed in a document without delaying a note's rendering.

Skribi has two primary modes: template and non-template. Templates are loaded from files in the configured template folder, and invoked with a colon. They may then be followed by pipe-separated values. Note that any pipes in the values must be escaped.

See: [Skribi Syntax](./syntax/skribi) and [Template Invocation](./syntax/templates)