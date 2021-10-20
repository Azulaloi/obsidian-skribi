# Settings

## **Template Directory**

Files in this folder are loaded as templates. 

## **Script Folder**

JS files in this folder are loaded as modules. For details, see [Scriptloading](../scripting/modules/scriptloader).

## **Auto Reload**

Enables the automatic rerendering of skribis when either their source template or the script cache changes.

## **Error Logging**

Logs any render errors to the console, rather than only as a tooltip on the errored skribi. It's off by default because it spams the console while you're editing.

## **Verbose Logging**

Provides additional information in the console.

Note that the displayed render times are inflated by async overhead. Also, the first evaluation of a skribi may take longer than subsequent evals. If you need more profiling tools, try the [Performance Test](../commands#performance-test) command.

<!-- Individual renders are logged *in addition* to block renders. That is, a lone skribi will create two log entries, one for itself and one for the block in which it was rendered.

The render times are a bit misleading. There's a lot of fluff from how the system works that inflates the values larger than the actual execution time. For example, the block logs (`Processed X skribis in element`) are inflated by 5-10ms, which you can see when the block only has one skribi which took half that. This is because of the way I check the results. Also, the first evaluation of a skribi takes much longer than subsequent evals, which I think has to do with JS compilation.

The times displayed are *not* consecutive, they're more or less all processed simultaneously. You can see that this is the case if you have several skribis in a single block - their individual logs might say 10ms each, but the block says it rendered all five of them in 20ms.

The time info was more helpful before I converted to an async design, but alas. If you need more profiling tools, try the [Performance Test](../commands#performance-test) command. -->

## **Template Suggestions**

Presents a suggestion popover when invoking a template, similar to the suggestions when creating a wikilink. Will suggest templates as well as any property keys defined in the templates frontmatter (like the insertion modal).