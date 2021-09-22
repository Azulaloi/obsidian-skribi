# Skribi Module

<table>
  <thead><tr><th>Object</th><th>Type</th><th>Description</th></tr></thead>
  <tbody>
    <tr>
      <th><code>sk.v</code></th>
      <td>Object</td>
      <td>Contains variables passed to the template. In a non-template context, this object is empty.</td>
    </tr>
    <tr>
      <th><code>sk.child</code></th>
      <td>Object</td>
      <td>Contains functions related to the <a href='#skchild'>MarkdownRenderChild</a>.</td>
    </tr>
    <tr>
      <th><code>sk.has(val: string): boolean</code></th>
      <td>Function</td>
      <td>Returns true if the property <code>val</code> exists on <code>sk.v</code>.</td>
    </tr>
    <tr>
      <th><code>sk.render(text: string): string</code></th>
      <td>Function</td>
      <td>Renders <code>text</code> as Obsidian Markdown inside a virtual element, then returns the element's <code>innerHTML</code>.</td>
</td>
    </tr>
    <tr>
      <th><code>sk.abort(data?: string | any): void</code></th>
      <td>Function</td>
      <td>Aborts the render execution and renders an error block. If `data` is a string, the message will be `data`. Multiple values can optionally be passed to the abort block, by placing them in an string-indexed object. Valid values (<code>key</code> - description):  <ul>
        <li><code>class: string</code> - CSS classes to add, space separated (default: 'abort')</li>
        <li><code>hover: string</code> - The message shown on mouse hover (default: 'Render Aborted')</li>
        <li><code>label: string</code> - The text shown in the block (default: 'sk')</li>
      </ul></td>
    </tr>
  </tbody>
</table>


## sk.child 

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
