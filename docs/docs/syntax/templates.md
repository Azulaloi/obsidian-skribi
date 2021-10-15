# Template Basics 

Skribi looks for template files in the configured **Template Directory**. Files with the extension `.md` or `.eta` are compiled and cached as templates. Files with the extension `.css` are cached as style snippets.

Invoking a template is simple: for a template named `template`, the syntax would be `{:template}`. 

When invoked, variables can be passed to the template. The name and value are separated by a colon, and the variables are separated by pipes: `|`. Pipes inside variables must be backslash-escaped: `\|`. To invoke `template` with the value `foo` set to `Fum`, the syntax would be: `{:template | foo: Fum}`. Values are interpreted as strings and whitespace trimmed.