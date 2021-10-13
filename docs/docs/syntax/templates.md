# Template Basics 

Skribi compiles files in the configured **Template Directory** as templates. When invoked, variables can be passed to the template. The name and value are separated by a colon, and the variables are separated by pipes: `|`. Pipes inside variables must be backslash-escaped: `\|`.

To invoke a template named `template`, the syntax would be: `{:template}`. 

Templates are written in Eta syntax.  

## CSS Styling

To apply a stylesheet, simply create a `<style>` element as you would in an HTML document. The rules defined by a skribi style element will apply only to the skribi element, which makes styling your components easy. If you want to add a global stylesheet, you can of course still use JS to do so.

Within the `<style>` sheet, each style rule is automatically constrained. To see the rendered style, inspect the style element in the elements panel. The keyword `:scope` is replaced with the constraint selector, so you can target the skribi element body with `:scope { ... }`.

To add a style programmatically, use `sk.child.addStyle(text)` where text is parsable CSS. This function will return a promise that resolves to the created style element **after** the element has attached to the document (which is after evaluation of the skribi function). **NOTE:** Because `addStyle()` cannot resolve until after the child has posted, which requires the main function to complete, awaiting this function will cause the skribi to hang, so anything you want to use the returned sheet will have to be done in `addStyle().then()`.

<!-- When [Shadow Mode](../settings#shadow-mode) is enabled, the style is not modified in this way, and the keyword `:scope` will target the shadow root. --> 