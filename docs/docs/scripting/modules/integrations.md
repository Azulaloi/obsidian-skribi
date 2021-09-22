# Integrations

If certain plugins are found to be loaded, an object containing functions for interacting with the plugin will be available.

- [Dataview](https://github.com/blacksmithgu/obsidian-dataview)  
Available as `dv`. Currently this is just a direct reference to the [plugin API](https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/api/plugin-api.ts) (NOT the inline API aka dataviewjs), but I'll add all the gizmos to make it work smoothly soon. 

As an example, to render a dataview table, one would call `#!ts dv.table(tableColumns, tableData, sk.child.el, sk.child.c, this.file.path)`. Note that dataview render functions like `dv.table` are not synchronous, so the rendered table will be appended to the element after it is rendered.

- [Weather](https://github.com/Azulaloi/obsidian-weather)  
Available as `weather`. Access the current weather cache with `weather.dispenseCache()`. Better documentation for this will be added when Weather is released. 

# Other

- `moment`: A reference to the global moment object, a powerful date and time manipulation tool. See [MomentJS](https://momentjs.com/) for documentation.