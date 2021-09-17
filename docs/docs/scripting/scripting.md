# Local Context 

Within the skribi evaluation context, a number of functions and variables are available to you. 

- `this`: A container object.
    - `plugin`: A reference to the Skribi plugin. 
    - `file`: The `TFile` inside of which the skribi is located. 
- `sk`: Contains various utility functions and references.   
    - `child`: References to the  
        - `el`: The element to which the rendered `tR` nodes will be added. Note that this element is not attached to the document and is empty until *after* the execution is complete.
        - `rerender()`: This function will cause the skribi to re-process itself.    

- `E, cb`: Internal Eta values.
- `tR`: The text return object that contains the output.
- `v`: Contains variables passed to the template. In a non-template context, this object is empty.
- `s`: Contains JS functions loaded from the configured **Script Directory**.


## `sk` Object

- `has(val: string): boolean`: Returns true if the property `val` exists on `v`. 
- `render(text: string): string`: Renders `text` as Obsidian Markdown inside a virtual element, then returns the element's `innerHTML`.

### `sk.child`

- `el`
- `reload()`
- `setInterval()`
- `registerUnload()`
