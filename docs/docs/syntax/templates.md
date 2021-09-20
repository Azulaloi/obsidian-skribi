# Template Basics 

Skribi compiles files in the configured **Template Directory** as templates. When invoked, variables can be passed to the template. The name and value are separated by a colon, and the variables are separated by pipes: `|`. Pipes inside variables must be backslash-escaped: `\|`.

To invoke a template named `template`, the syntax would be: `{:template}`. 