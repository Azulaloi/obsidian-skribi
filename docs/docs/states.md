# State Indicators

When a skribi is not able to display a rendered result, a state indicator will be rendered in its place. These indicators are code elements with the text 'SK', typically with an icon. Any described animations will not occur if the setting 'CSS Animations' is set to false. Some indicators can be clicked on to provide additional information (in this case, the color will change when hovered).

<hr>
**Errors**

- Red with a boxed exclamation mark (`skr-error`) indicates that an error was thrown during invocation. Hover over it to see a tooltip describing the error, or click to open the error modal, which will display the error in more detail.

- Gray with a red-underlined 'JS' or 'η' (`skr-syntax-js`, `skr-syntax-eta`) indicates a Javascript or Eta parsing error, respectively. Hover or click for more detailed information, which Skribi will attempt to provide. 

- Orange with an exclamation mark in a triangle (`skr-abort`) indicates that an abort command was invoked by the skribi function. This only occurs when user code invokes `sk.abort`, and is intended to help differentiate user-intended error states.

<hr>
**Other**

- A blue spinning circle-arrow (`skr-waiting`) indicates that the template being invoked has not yet been loaded. It will be replaced once the template is loaded and rendered. This happens briefly if there are skribis on first page after launching Obsidian. It may also occur if the template cache is recompiled.

- A green writing quill (`skr-evaluating`) indicates that the skribi is currently being evaluated. Most skribi evaluations are too quick to see, so this most often occurs when the skribi function is awaiting lengthy operation.

- A purple spinning spiral (`skr-depth`) indicates that a transclusion could not be rendered because the depth limit has been reached. 

- A skribi-invoking codespan with light blue text (`skr-stasis`) indicates that invocation was not possible because the depth limit has been reached.

- Amber with no icon (`skr-self`) indicates that the skribi was not rendered because it is being rendered within its own definition. (If you want this behaviour for some reason let me know and I'll add an option for it.)