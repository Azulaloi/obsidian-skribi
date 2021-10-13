# Template Basics 

Skribi compiles files in the configured **Template Directory** as templates. When invoked, variables can be passed to the template. The name and value are separated by a colon, and the variables are separated by pipes: `|`. Pipes inside variables must be backslash-escaped: `\|`.

To invoke a template named `template`, the syntax would be: `{:template}`. 

Templates are written in Eta syntax.  

## CSS Styling

To apply a stylesheet, simply create a `<style>` element as you would in an HTML document. The rules defined by a skribi style element will apply only to the skribi element, which makes styling your components easy. If you want to add a global stylesheet, you can of course still use JS to do so.