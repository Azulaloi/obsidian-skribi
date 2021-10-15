<style> .md-grid {max-width: 70rem;} </style>

# Skribi Module

<table>
  <thead><tr><th>Property of <code>sk</code></th><th>Type</th><th>Description</th></tr></thead>
  <tbody>
    <tr>
      <th><code>v</code></th>
      <td><code>{[key: string]: string}<code></td>
      <td>Contains variables passed to the template. In a non-template context, this object is empty.</td>
    </tr>
    <tr>
      <th><code>child</code></th>
      <td><a href='#skchild'>Object</a></td>
      <td>Contains functions related to the <a href='#skchild'>MarkdownRenderChild</a>.</td>
    </tr>
    <tr>
      <th><code>ctx</code></th>
      <td>Object</td>
      <td> Contains direct references to various objects.
        <ul>
          <li><code>plugin: <a href='https://github.com/Azulaloi/obsidian-skribi/blob/master/src/main.ts#L12'>SkribosPlugin</a></code>: A reference to the Skribi plugin.</li>
          <li><code>file?: <a href='https://github.com/obsidianmd/obsidian-api/blob/763a243b4ec295c9c460560e9b227c8f18d8199b/obsidian.d.ts#L3053'>TFile</a></code>: The file inside of which the skribi is being rendered. Null if not being rendered inside of a file. </li>
          <li><code>app: <a href='https://github.com/obsidianmd/obsidian-api/blob/763a243b4ec295c9c460560e9b227c8f18d8199b/obsidian.d.ts#L245'>App</a></code>: The Obsidian app.</li>
        </ul>
      </td>
    </tr>
    <tr>
      <th><code>this</code></th>
      <td>Object</td>
      <td> A reference to the template function's bound `this` object. Possibly useful for storing values to be accessed by scripts. </td>
    </tr>
    <tr>
      <th><code>sk.has(val: string)</code></th>
      <td>=> <code>boolean</code></td>
      <td>Returns true if the property <code>val</code> exists on <code>sk.v</code>.</td>
    </tr>
    <tr>
      <th><code>sk.render(text: string)</code></th>
      <td>=> <code>string</code></td>
      <td>Renders <code>text</code> as Obsidian Markdown inside a virtual element, then returns the element's <code>innerHTML</code>.</td>
    </tr>
    <tr id="abort">
      <th><code>sk.abort(data?: string | any)</code></th>
      <td>=> <code>void</code></td>
      <td>Aborts the render execution and renders an error block. If `data` is a string, the message will be `data`. Multiple values can optionally be passed to the abort block, by placing them in an string-indexed object. Valid values (<code>key</code> - description):  <ul>
        <li><code>class: string</code> - CSS classes to add, space separated (default: 'abort')</li>
        <li><code>hover: string</code> - The message shown on mouse hover (default: 'Render Aborted')</li>
        <li><code>label: string</code> - The text shown in the block (default: 'sk')</li>
      </ul></td>
    </tr>
    <tr>
      <th><code>sk.getStyle(styleName: string)</code></th>
      <td>async => <code>Promise&lt;string&gt;</code></td>
      <td>Returns a promise for the text content of the file <code>styleName.css</code> in the template directory, if it exists. Resolves on completion of initial template load (instant if already complete).</td>
    </tr>
    <tr>
      <th><code>sk.includeStyle(styleName: string)</code></th>
      <td>async => <code>Promise&lt;<a href='https://developer.mozilla.org/en-US/docs/Web/API/HTMLStyleElement'>CSSStyleElement</a>&gt;</code></td>
      <td>Equivalent to <code>sk.child.addStyle(await sk.getStyle(styleName))</code>. </td>
    </tr>
  </tbody>
</table>


## sk.child 

<table>
  <thead><tr><th>Property of <code>sk.child</code></th><th>Type</th><th>Description</th></tr></thead>
  <tbody>
    <tr>
      <th><code>el</code></th>
      <td><code><a href='https://developer.mozilla.org/en-US/docs/Web/API/HTMLDivElement'>HTMLDivElement</a></code></td>
      <td>The element to which the rendered `tR` nodes will be added. Note that this element is empty and not attached to the document until *after* the execution is complete.</td>
    </tr>
    <tr>
      <th><code>reload(id?: string)</code></th>
      <td>=> <code>void</code></td>
      <td>Force the skribi to re-process itself, unloading the current child in the process. If the skribi type is template, providing <code>id</code> will use a freshly retrieved version of that template as its source (used by <a href='../../../settings#auto-reload'>Auto Reload</a>).</td>
    </tr>
    <tr>
      <th><code>registerInterval(cb: Function, t: number, ...args: any[])</code></th>
      <td>=> <code>void</code></td>
      <td>Registers the function `cb` to be called every <code>t</code> seconds with the arguments <code>args</code>. Interval is cleared on unload.</td>
    </tr>
    <tr id="register-post">
      <th><code>registerPost(cb: Function, ...args: any[])</code></th>
      <td>=> <code>void</code></td>
      <td>Registers the function <code>cb</code> to be called after the skribi render function has been fullfilled and <code>sk.child.el</code> appended to the view. Called before embeds are rendered.</td>
    </tr>
    <tr>
      <th><code>registerUnload(cb: Function, ...args: any[])</code></th>
      <td>=> <code>void</code></td>
      <td>Registers a function to called on child unload, which occurs when the element or child is destroyed. Use this to clear references as necessary.</td>
    </tr>
    <tr>
      <th><code>registerEvent(event: EventRef)</code></th>
      <td>=> <code>void</code></td>
      <td>Registers an EventRef to be safely offref'd on unload.</td>
    </tr>
    <tr>
      <th><code>addStyle(text: string)</code></th>
      <td>async => <code>Promise&lt;<a href='https://developer.mozilla.org/en-US/docs/Web/API/HTMLStyleElement'>CSSStyleElement</a>&gt;</code></td>
      <td>Creates and attaches style element composed from the CSS-parsable string <code>text</code>. Returns a promise that resolves <strong>after</strong> the skribi function resolves and is attached to the document. Awaiting this value directly will thus cause the skribi function to hang.</td>
    </tr>
    <tr>
      <th><code>_c</code></th>
      <td><code><a href='https://github.com/Azulaloi/obsidian-skribi/blob/master/src/render/child.ts'>SkribiChild</a></code></td>
      <td>A direct reference to the child object. Not really intended to be accessed, just in case you wanna reach in there directly with your <strike>nasty</strike> code fingers. </td>
    </tr>
  </tbody>
</table>

