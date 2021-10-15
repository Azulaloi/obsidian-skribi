# Eta Basics

First, review the **[Eta Syntax](https://eta.js.org/docs/syntax)** and related documentation and examples for a complete overview of the Eta format.

Let's go over some details about how this process works. We will refer to the text sent to Eta as the **input**. The input is transformed into a JS function and executed, returning the string object `tR`, which is the **output**. Essentially, that is the core mechanism of Eta. 

In the input, untagged text will be output as text (in the JS function, it becomes an addition assignment to `tR`). Text inside of Eta tags is evaluated as depending on the tag type:

- `<% %>` is the evaluation tag, where javascript is executed. To add text to the output, assign to `tR`. The addition assignment operator is useful in this context: `tR += 'text to be appended`. In this way, even a single eval tag can create an output.

- `<%= %>` is the interpolation tag - the value of its contents is coerced to a string and appended to `tR`. For example, `<%= foo %>` is equivalent to `<% tR += (foo) %>`. However, the contents are XML-escaped.

- `<%~ %>` is the **raw interpolation** tag - equivalent to interpolation, but the contents are *not* XML-escaped.

After interpretation is complete, `tR` is rendered as Obsidian Markdown, creating HTML elements, which are then appended to the skribi element, which is then attached to the document.

## Examples of Eta Compilation

The output functions in these examples are simplified for clarity (the actual functions have a bunch of extra stuff we don't need to think about right now).

A very simple input, containing only `A line of text.` would be compiled to `function () {tR += 'A line of text.'; return tR;}`.

Something more complicated, multiline code:

```
<% let bool = true %>
<% if (bool) { %>
True
<% } else { %>
False
<% } %>
```

Compiles to:

```
function() {
  let bool = true
  if (bool) {
    tR+='True\n'
  } else {
    tR+='False\n'
  }
  return tR;
}
```

In this way, hopefully the nature of Eta is a bit clearer.






