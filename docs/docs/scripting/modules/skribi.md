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
      <th><code>sk.ctx</code></th>
      <td> Object </td>
      <td> Contains direct references to various objects, for those familiar with Obsidian's API.
        <ul>
          <li><code>plugin</code>: A reference to the Skribi plugin.</li>
          <li><code>file</code>: The <a href='https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts#L2872'>TFile</a> inside of which the skribi is being rendered, or null if not being rendered inside of a file. </li>
          <li><code>app</code>: The Obsidian app.</li>
        </ul>
      </td>
    </tr>
    <tr>
      <th><code>this</code></th>
      <td> A reference to the template function's bound `this` object. </td>
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
    <tr id="abort">
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

<table>
  <thead><tr><th>Object</th><th>Type</th><th>Description</th></tr></thead>
  <tbody>
    <tr>
      <th><code>sk.child.el</code></th>
      <td>HTMLDivElement</td>
      <td>The element to which the rendered `tR` nodes will be added. Note that this element is empty and not attached to the document until *after* the execution is complete.</td>
    </tr>
    <tr>
      <th><code>sk.child.reload()</code></th>
      <td>() => void</td>
      <td>Force the skribi to re-process itself, unloading the current child in the process.</td>
    </tr>
    <tr>
      <th><code>sk.child.registerInterval(cb: Function, t: number, ...args: any[]): void</code></th>
      <td>() => void</td>
      <td>Registers the function `cb` to be called every `t` seconds with the arguments `args`. Interval is cleared on unload.</td>
    </tr>
    <tr>
      <th><code>sk.child.registerPost(cb: Function, ...args: any[]): void</code></th>
      <td>() => void</td>
      <td>Registers the function `cb` to be called after the skribi render function has been fullfilled and `sk.child.el` appended to the view. Called before embeds are rendered.</td>
    </tr>
    <tr>
      <th><code>sk.child.registerUnload(cb: Function, ...args: any[]): void</code></th>
      <td>() => void</td>
      <td>Registers a function to called on child unload, which occurs when the element or child is destroyed.</td>
    </tr>
    <tr>
      <th><code>sk.child.registerEvent(event: EventRef): void</code></th>
      <td>() => void</td>
      <td>Registers an EventRef to be safely offref'd on unload.</td>
    </tr>
    <tr>
      <th><code>sk.child.c: SkribiChild extends MarkdownRenderChild</code></th>
      <td>SkribiChild</td>
      <td>A direct reference to the child object. Not really intended to be accessed, just in case you wanna reach in there directly with your nasty code fingers. </td>
    </tr>
  </tbody>
</table>

