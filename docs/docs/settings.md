# Plugin Settings

## **Template Folder**

Files in this folder are loaded as templates.

## **Script Folder**

JS files in this folder are loaded as functions.

## **Verbose Logging**

Provides (a lot of) additional information in the console.

Results from each processed block element and individual skribi is logged. Because postprocessors are called per-block, I can't get the total time (start first render to finish last render) for a document, unfortunately. At least, not easily enough to be worth implementing.

Note on parsing times: the times displayed are *not* consecutive, they're more or less all processed simultaneously. You can see that this is the case if you have several skribis in a single block - their individual logs might say 10ms each, but the block says it rendered all five of them in 20ms.

The block logs (the ones that say `Processed X skribis in element`) are inflated by 5-10ms or so because of the way I check the results. I'll try and fix that...

Also, the times inevitably vary somewhat each execution.