# Metadata

Frontmatter in a template file is omitted from the template, and used to inform Skribi about your template.

To declare a field, add an entry with a key beginning with an underscore. When using the **Insert Skribi** command, you will be prompted to fill out the declared values. The value of the entry may be null or an object containing information about the field.

Valid object keys:

  - `type`: The type of field prompt. Defaults to "string", which currently the only valid type.
  - `name`: Sets the label of the field in the prompt (defaults to field key)
  - `default`: Sets the default value of the field in the prompt
  - `placeholder`: Sets the 'ghost text' of the field in the prompt (will not be visible unless default is empty or null)

Example of the frontmatter object syntax:
```
---
_val: {default: Fum, name: Value}
---
```

The above example will then prompt like so:

<img src="https://imgur.com/Ufc3dTI.png" style="width: 40%;"/>

Which will insert `{:templatename | foo: Fum}`.
