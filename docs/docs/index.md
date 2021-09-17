# Outline

Skribi provides live templating inside of Obsidian, powered by Eta.

## Usage Details

Skribis are placed inside of inline or block code elements, and are processed asynchronously during markdown rendering. There are two primary types of skribis: template and non-template. The contents of template invocations are sent to the template, while that of non-templates are processed by Eta.

To create an inline skribi, use curly brackets. There are four types of non-template flags that wrap the contents in Eta tags for convenience. 

- `{: }` - **Template**: Invokes a template.
- `{= }` - **Interpolate**: Processed as `<%= ... %>`
- `{~ }` - **Raw Interpolate**: Processed as `<%~ ... %>`
- `{. }` - **Evaluation**: Processed as `<% ... %>`
- `{{ }}` - **Literal**: Processed as ` ... `

To use a codeblock, set the block's language to `skribi` or `sk`. Without a flag, these are processed literally, meaning that they must start and end with `{ }`, just like an inline. To add a flag, suffix the type with `-flag` where flag is one of the following:

- `int` - **Interpolate**: Processed as `{= ... }`
- `raw` - **Raw Interpolate**: Processed as `{~ ... }`
- `eval` - **Evaluate**: Processed as `{. ... }`
- `lit` - **Literal**: Processed as `{{ ... }}`

## Template Invocation

Skribi compiles files in the configured **Template Directory** as templates. When invoked, variables can be passed to the template. The name and value are separated by a colon, and the variables are separated by pipes: `|`. Pipes inside variables must be backslash-escaped: `\|`.
