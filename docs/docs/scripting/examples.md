# Examples

I'll add plenty of examples here at some point.

## Using **sk.render()**

Takes a string, renders it to markdown, and outputs the HTML as text. Placing this within a raw tag (`<%~ %>` in a template or `{~ }` in a doc) will then render the HTML as elements (if it parses), whereas in an interpolate tag you'll just get the escaped HTML as text. HTML in a template will already render like any other HTML written in a page, but this is useful to render markdown elements inside of block elements (which Obsidian will not process markdown inside of). 

For example, `<div> ![[<%=sk.v.imgpath%>]] </div>` will render as a div with the text `![[imgpath]]`, but ``<div> <%~ sk.render(`![[${sk.v.imgpath}]]`)%> </div>`` will render as an image embed span with src `imgpath` inside the div. As an example of the `{{ }}` tags, you could achieve the same with ``{{ <div><%~sk.render(`![[${sk.v.imgpath}]]`)%></div> }}``. 

Because post processors are not applied to block-level elements, skribis instead of block level elements will not render, even if you create the code span with html. However, inside of a rendered skribi, nested skribis *will* render even inside of block elements, and may be created with ``sk.render("`{}`")`` or `<code>{ }</code>`, to a depth of 5 (will add a setting to increase limit later). You can also call a template directly in javascript with the Eta function `include()`.

Note: the markdown renderer likes to embed everything in `<p>`s and `<div>`s. I'm not sure the best way to deal with that yet, but it's not really a problem - just kind of clutters the DOM a bit. When styling your templates, make sure to use the inspector to see the actual structure of your rendered elements.

Also, the output is always placed in a div with the attribute `skribi`, with the value set to the name of the template. In CSS, you can target these with `div[skribi="name"]`. `div[skribi]` will select all skribis.


## Using **sk.child.registerInterval()**

Here is a very simple example of creating an updating clock.

Note that the documentation system I'm using [replaces spaces in codeblocks with non-breaking spaces](/scripting/errors/#escape), so copy-pasting from the code block below will not work (sorry about that).

```
<% 
let time = moment().format('HH:mm:ss')
sk.child.registerInterval(() => sk.child.reload(), 1)
%>

<%=time%>
```
