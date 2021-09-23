# Integrations

If certain plugins are found to be loaded, an object containing functions for interacting with the plugin will be available in the `int` object. 

When the relevant plugin is not loaded, accessing the module will throw an error, which (like any error) will abort the render if not caught with a `try catch` block.

If you would like integration with another plugin, you may make a request by <a href="https://github.com/Azulaloi/obsidian-skribi/issues">opening an issue on the Skribi repository.</a> 

<h2><a href="https://github.com/blacksmithgu/obsidian-dataview">Dataview</a></h2>
<code style="font-size: 1em;">int.dv</code>

Currently this is just a reference to the [plugin API](https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/api/plugin-api.ts) (NOT the inline API like dataviewjs). I'm considering a making this a wrapper with all the gizmos (helper functions).

For example: to render a dataview table, one would call `#!ts int.dv.table(tableColumns, tableData, sk.child.el, sk.child.c, this.file.path)`. Note that dataview render functions like `dv.table` are not synchronous and do not return a table object or promise. If you want to interact with the resulting element in code, you'll need to [await](/scripting/errors/#async) a DOM observer or something.

<h2><a href="https://github.com/Azulaloi/obsidian-weather">Weather</a></h2>
<code style="font-size: 1em;">int.weather</code>

A wrapper for the WeatherPlugin API, with some utility functions.

Access the current weather cache with `int.weather.dispenseCache()`. Better documentation for this will be added when Weather is released. 
