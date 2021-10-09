# Context 

The string content of a skribi is parsed by Eta into a function, which returns the object `tR`, which is rendered to markdown and appended to the container element. This means that any evaluated javascript inside of the skribi is invoked within the function context. Within said context, a number of functions, variables, references, and helper components are available to you.

## Local Scope Variables

The following properties are defined in the local scope. 

<table>
    <thead><th>Object</th><th>Description</th></thead>
    <tbody>
        <tr><th><code>this</code></th><td> The template function's bound `this` object.</td></tr>
        <tr><th><code>scope</code></th><td> Internal object used to provide objects to the local scope. You may inspect this object to view the provided objects.</td></tr>
        <tr><th><code>E</code>, <code>cb</code></th><td> Internal Eta values, do not assign to them.</td></tr>
        <tr><th><code>tR</code></th><td> The string that will be returned by the template function.</td></tr>
        <tr><th><code>sk</code></th><td><a href='/obsidian-skribi/scripting/modules/sk/child'>Skribi Module</a> - Contains various skribi objects and functions, including template variables.</td></tr>
        <tr><th><code>js</code></th><td><a href='/obsidian-skribi/scripting/scriptloader/'>Scriptloader Module</a> - Contains JS functions and function-containing objects loaded from the configured Script Directory</td></tr>
        <tr><th><code>int</code></th><td><a href='/obsidian-skribi/scripting/integrations/'>Integration Modules</a> - Contains any loaded integration modules. These modules will throw an error if accessed without the relevant plugin enabled. </td></th>
        <tr><th><code>obsidian</code></th><td><a href='/obsidian-skribi/scripting/integrations/'>Obsidian Module</a> - Contains Obsidian functions.</td></th>
        <tr><th><code>moment</code></th><td><a href='/obsidian-skribi/scripting/integrations/'>Moment Module</a> - A reference to the global moment object, a powerful date and time manipulation tool. See <a href='https://momentjs.com/'>MomentJS</a> for documentation.</td></th>
    <tbody>
</table>

