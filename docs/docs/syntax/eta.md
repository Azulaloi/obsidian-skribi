# Eta Basics

First, reference the **[Eta Syntax](https://eta.js.org/docs/syntax)** and related documentation and examples for more details and information about Eta.

However, we will briefly review the basics. We will refer to the text sent to Eta as the **input**. The input is transformed into a JS function and executed, returning the string object `tR`, which is the **output**. 

In the input, text will be output as text. Text inside of Eta tags is evaluated depending on the tag type:

- `<% %>` is the evaluation tag, where javascript is executed. To add text to the output, assign to `tR`. The addition assignment operator is useful in this context: `tR += 'text to be appended`.

- `<%= %>` is the interpolation tag - the value of its contents is coerced to a string and appended to `tR`. For example, `<%= foo %>` is equivalent to `<% tR += (foo) %>`. However, the contents are XML-escaped.

- `<%~ %>` is the **raw interpolation** tag - equivalent to interpolation, but the contents are *not* XML-escaped.

After interpretation is complete, `tR` is rendered as Obsidian Markdown, which is then appended to the skribi element.
