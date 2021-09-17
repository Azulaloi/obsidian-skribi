# Local Context 

Within the skribi evaluation context, a number of functions and variables are available to you. 

- `this`: A container object.
    - `plugin`: A reference to the Skribi plugin. 
    - `file`: The `TFile` inside of which the skribi is being rendered. 
- `sk`: Contains various utility functions and references.   
    - `child`: The MarkdownRenderChild descendant
- `E, cb`: Internal Eta values.
- `tR`: The text return object that contains the output.
- `v`: Contains variables passed to the template. In a non-template context, this object is empty.
- `s`: Contains JS functions and function-containing objects loaded from the configured **Script Directory**, as outlined in [Scriptloading](/scripting/scriptloading).

## sk

- `#!ts has(val: string): boolean`  
Returns true if the property `val` exists on `v`. 
- `#!ts render(text: string): string`  
Renders `text` as Obsidian Markdown inside a virtual element, then returns the element's `innerHTML`.
- `#!ts abort(data: string | any): void`  
Aborts the render execution and renders an error block. If `data` is a string, the message will be `data`. If data is an object, multiple values can optionally be passed to the abort block. These are: 
    - `class` - CSS classes to add, space separated (default: 'abort')
    - `hover` - The message shown on mouse hover (default: 'Render Aborted')
    - `label` - The text shown in the block (default: 'sk')

### sk.child

- `#!ts el: HTMLDivElement`  
The element to which the rendered `tR` nodes will be added. Note that this element is empty and not attached to the document until *after* the execution is complete.
- `#!ts reload()`  
Force the skribi to re-process itself, unloading the current context in the process.
- `#!ts registerInterval(cb: Function, t: number, ...args: any[]): void`  
Registers the function `cb` to be called every `t` seconds with the arguments `args`. Interval is cleared on unload.
- `#!ts registerUnload(cb: Function, ...args: any[]): void`  
Registers a callback to be executed on unload.
- `#!ts registerEvent(event: EventRef): void`
Registers an EventRef to be properly cleared on unload.


## Conditional Integrations

If certain plugins are found to be loaded, an object containing functions for interacting with the plugin will be available.

- [Weather](https://github.com/Azulaloi/obsidian-weather)  
Available as `weather`. Access the current weather cache with `weather.dispenseCache()`. Better documentation for this will be added when Weather is released. Also, Weather adds three events to `app.workspace`: `az-weather:api-ready`, `az-weather:api-unload`, and `az-weather:api-tick`. Tick triggers whenever the weathercache is updated, and can be used to trigger a rerender through `sk.child.registerEvent()`.

- [Dataview](https://github.com/blacksmithgu/obsidian-dataview)  
Available as `dv`. Currently this is just a direct reference to the plugin API, but I'll add all the gizmos to make it work smoothly soon. 