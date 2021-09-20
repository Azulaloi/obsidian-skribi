# Local Context 

Within the skribi evaluation context, a number of functions and variables are available to you. 

- `this`: A container object.
    - `plugin`: A reference to the Skribi plugin. 
    - `file`: The `TFile` inside of which the skribi is being rendered. See: ![TFile](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts#L2872).
    - `app`: The Obsidian app.
- `sk`: Contains various utility functions and references.   
    - `child`: The MarkdownRenderChild descendant.
- `scope`: Contains the objects added to the local context.
- `E, cb`: Internal Eta values.
- `tR`: The text return object that contains the output.
- `v`: Contains variables passed to the template. In a non-template context, this object is empty.
- `s`: Contains JS functions and function-containing objects loaded from the configured **Script Directory**, as outlined in [Scriptloading](/scripting/scriptloading).
- `moment`: A reference to the global moment object. See [MomentJS](https://momentjs.com/) for documentation
- Any loaded [Integration Modules](#conditional-integrations)

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
Registers an EventRef to be offref'd on unload.
- `#!ts c: SkribiChild extends MarkdownRenderChild`   
A direct reference to the MarkdownRenderChild object. Note: use the functions on `sk.child` rather than those `sk.child.c`. 

## Conditional Integrations

If certain plugins are found to be loaded, an object containing functions for interacting with the plugin will be available.

- [Dataview](https://github.com/blacksmithgu/obsidian-dataview)  
Available as `dv`. Currently this is just a direct reference to the [plugin API](https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/api/plugin-api.ts) (NOT the inline API aka dataviewjs), but I'll add all the gizmos to make it work smoothly soon. 

As an example, to render a dataview table, one would call `#!ts dv.table(tableColumns, tableData, sk.child.el, sk.child.c, this.file.path)`. Note that dataview render functions like `dv.table` are not synchronous, so the rendered table will be appended to the element after it is rendered.

- [Weather](https://github.com/Azulaloi/obsidian-weather)  
Available as `weather`. Access the current weather cache with `weather.dispenseCache()`. Better documentation for this will be added when Weather is released. 

