# Scriptloader

Any `.js` files inside of the configured [Script Directory](/settings/#script-folder) are automatically loaded by Skribi, and their exported properties made available in the `js` object. Any file modifications, additions, or deletions are detected and the modules reloaded automatically.  

## Exporting

A module's exports consist of any properties belonging to the `module.exports` object. To export a property, assign to a property thereof, ex: `module.exports.foo = property`. Assigning to `module.exports` will overwrite the export object, which may or may not be desirable: `module.exports = {fe, fi, fo}`.

In the following example, note that first function has no key, while the second does - functions are implicitly keyed with their name. This is not the case for other types, like numbers or strings - `module.exports = {'foo', 2}` is a syntax error. 

The statement `module.exports = {fuctionOne, functionTwo: otherFunctionName, foo: 'fum'}` would load as:

```
js.moduleName: {
  functionOne: ƒ functionOne()
  functionTwo: ƒ otherFunctionName()
  foo: "fum"
}
```

### Export Details

The scriptloader has a couple extra features.

Firstly, if you assign a string to `exports._name`, the file will be loaded under that string rather than the filename.

Second, if you assign only **one** value (not counting `_name`) to `exports`, that function will be available directly as `js.moduleName()`. If multiple values are present, the functions will be inside of `js.moduleName`, as in the example. This is a convenience feature - to prevent it, simply export more than one value. Or ask me to add a setting.

When only one property is exported, the module key is determined by:  

  1. `module.exports._name`, if it is a string.  
  2. The key of the single value. Remember that functions are implicitly keyed.  

When multiple properties are exported, the module key is determined by:  

  1. `module.exports._name`, if it is a string.  
  2. The name of the source file.  

**Tip:** To inspect the `js` object, call `console.log(js)` in an evaluation tag. This will display the object in the dev console. If verbose logging is enabled, the loader will log whenever it loads a JS file.

### Additional Notes

Note that your do not need to export all of the functions in your module, as exported functions can still utilize non-exported functions. See also: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures">Javascript Closures</a> and <a href="https://nodejs.org/api/modules.html#modules_modules_commonjs_modules">CommonJS Modules</a>.

<hr>

Additionally, a potentially confusing quirk of CJS module exports is the difference between `module.exports` and `exports`: the former is the actual object, while the latter is a shorthand proxy. You may assign to the properties of both objects and all will export successfully, but if you assign to either of them, this functionality will break. 

For example, `exports = {foo}` or `module.exports = {foo}` will cause `exports` to no longer contribute to the exported module - in this case, only `module.exports` will be exported. However, `exports.foo = foo; module.exports.fum = fum;` will load both `foo` and `fum`. 

For more information about this behavior, see <a href="https://nodejs.org/api/modules.html#modules_exports_shortcut">Module Exports Shortcut</a>. For information about exports in general, see <a href="https://nodejs.org/api/modules.html#modules_module_exports">Module Exports</a>.
