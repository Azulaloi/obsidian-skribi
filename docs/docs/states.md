# State Indicators

Skribis may render with colors or icons to indicate their state.

- Original code but in green means that the skribi is loading. I've never actually seen this because they usually render before the page, but you might see it if your script takes longer than the page to render.

- Blue `SK` with a spinning circle-arrow means that the template being invoked has not yet been loaded. It will be replaced once the template is loaded and rendered. This happens briefly if there are skribis on first page after launching Obsidian.

- Red `SK` with an exclamation mark means there was an error. Hover over it to see the error message. This will happen if Eta parsing fails, for example, or if a non-existant template is invoked.

- Original code but in light blue means that the skribi was not rendered because it hit the recursion limit. 
- An empty div with a spinning spiral is rendered in the place of an embed when the depth limit is reached. 
- Original code but in orange means that the skribi was not rendered because it is invoking itself (if you want this behaviour for some reason let me know and I'll add an option for it).