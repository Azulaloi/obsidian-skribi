# Template Basics 

Skribi looks for template files in the configured **Template Directory**. Files with the extension `.md` or `.eta` are compiled and cached as templates. Files with the extension `.css` are cached as style snippets. In the event an `.md` file and an `.eta` file share a filename, only one will be loaded (so don't do that).

Invoking a template is simple: for a template named `template`, the syntax would be `{:template}`. 

When invoked, variables can be passed to the template. The name and value are separated by a colon, and the variables are separated by pipes: `|`. Pipes inside variables must be backslash-escaped: `\|`. To invoke `template` with the value `foo` set to `Fum`, the syntax would be: `{:template | foo: Fum}`. Values are interpreted as strings and whitespace trimmed.

## Working with Templates

It's possible to work with your templates inside of Obsidian, but it's not designed for that purpose, and as a result writing JS/HTML/Eta in Obsidian is (in my opinion) rather unpleasant. I highly recommend using VSCode (or another external editor of your choice) and adding your template and script directories to your workspace. 

For the best experience, I also recommend the [Eta Extension for VSCode](https://marketplace.visualstudio.com/items?itemName=shadowtime2000.eta-vscode) to add support for `.eta` files. If it bothers you that it doesn't highlight the YAML template metadata properly, contact me and I'll tell you how to make it do that.

When a template or script is modified externally, any skribis using them are automatically reloaded, so you can see your changes immediately. 
