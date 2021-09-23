# Misc

## Embeds



## Recursion

Skribis use a number of methods to track their nesting depth through skribi-in-skribis, embedded transclusions, and mixtures thereof. It's a bit more restrictive than it probably needs to be - at some point I'll add a setting to alter the limit.

I'm 97% sure that skribis will not recurse infinitely under normal circumstances, but it might be possible if you tried really hard. In the event of an infinite recursion, Obsidian will freeze. In all of my testing, ending the task and reopening Obsidian was enough, as the page it opened to would be the previously closed one rather than the page that recursed. 

In the event that reopening Obsidian immediately freezes again (which never occured in testing), I recommend either editing the offending file/template externally, or removing 'obsidian-skribi' from `.obsidian/community-plugins.json`. 

If you discover a recursion case, please <a href="https://github.com/Azulaloi/obsidian-skribi/issues">report it by opening an issue on the repo</a>.

## Error Handling

When an error is thrown during skribi evaluation, the render will be aborted and replaced with an red error element. If you hover over the element, you will see the error message. If you want it as text, inspect the element and the error will be available under the `title` attribute.

Most error cases should have descriptive messages (insofar as typescript has descriptive errors, that is) - if it says something like 'Skribi: Unknown Error' then I probably made a mistake somewhere and you should let me know. 

By throwing an error yourself, or calling the utility function `sk.abort()` ([See `sk.abort()` Documentation](/scripting/modules/skribi/#abort)), the execution of the skribi function is aborted and an error element is rendered with the error message as a tooltip, like any other error.

Also, if you log anything to the console, you can click on the `VMXXXX` trace to view the compiled function. This is helpful for understanding exactly what's actually happening internally.

<hr id="escaped">

If you're getting a `SyntaxError: Unexpected token` and you're really super certain that it should be parsing, check that your code does not contain **escaped characters** such as non-breaking spaces (`&nbsp;`), which render as normal spaces. Rather obnoxiously, any code copy-pasted from this documentation will have these villanous false spaces. I'll look into a fix.

## Async

If the compiled string contains `await` anywhere (including as plaintext), the template function will be compiled to a promise. While awaiting the resolution of the template function, a placeholder element will be rendered - similar to an error element (but green!). This element will be replaced with the actual element (accessible in `sk.child.el`) upon resolution.