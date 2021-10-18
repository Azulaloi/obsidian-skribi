# Styling

There are a few ways to include a style in your skribi. 

**1**: If you have a `.css` file in your templates directory, you can load it in your skribi with <a href='../../scripting/modules/skribi#includestyle'><code>sk.includeStyle(style)</code></a> where style is a string matching the filename of your `.css` file. Styles loaded in this way are not processed by Eta. You can also get the style snippet as text with <a href='../../scripting/modules/skribi#getstyle'><code>sk.getStyle(style)</code></a>.

Styles loaded with `sk.includeStyle()` will cause the skribi to reload whenever the `.css` file is modified, just like it would if its template file was modified.

**2**: Creating a `<style>` element directly in the skribi as you would create any other element. Currently, only the first style element will be processed. You can then use Eta syntax inside of the style element.

**3**: To load any text as a stylesheet, use `sk.child.addStyle(text)`. `text` should be parsable CSS.

<!-- Commented out because this information exists in the function documention but I'm not sure if I should keep it here

## Technical Notes

Method 3, `sk.child.addStyle()`, will return a promise that resolves to the created style element **after** the element has attached to the document (which is after evaluation of the skribi function). Because `addStyle()` cannot resolve until after the child has posted, which requires the main function to complete, awaiting this function will cause the skribi to hang, so anything you want to use the returned sheet will have to be done in `addStyle().then()`.

Method 1, `sk.includeStyle(style)`, is equivalent to `sk.child.addStyle(await sk.getStyle(style))`, and therefore subject to the same caveats.

-->

## Scoping

The rules defined by a skribi style element will apply only to the skribi element, which makes styling your components easy. If you want to add a global stylesheet, you can of course still use JS to do so.

When created through one of these methods, each style rule is automatically constrained. To see the rendered style, inspect the style element in the elements panel. The keyword `:scope` is replaced with the constraint selector, so you can target the skribi element body with `:scope { ... }`.

<!-- When [Shadow Mode](../settings#shadow-mode) is enabled, the style is not modified in this way, and the keyword `:scope` will target the shadow root. --> 