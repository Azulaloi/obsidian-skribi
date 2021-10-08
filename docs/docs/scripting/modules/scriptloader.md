# Scriptloader

Any `.js` files inside of the configured [Script Directory](/obsidian-skribi/settings/#script-folder) are automatically loaded by Skribi, and their exported properties made available in the `js` object. Any file modifications, additions, or deletions are detected and the modules reloaded automatically.  

**Note:** Obsidian by default does not show unrecognized file extensions in the file explorer, so `.js` files will not be visible. You may use a plugin such as [CodeView](https://github.com/zsviczian/obsidian-codeeditor) to allow Obsidian to show JS files in the file explorer (as well as edit them within Obsidian). Personally, I use VSCode to edit my scriptloader scripts, by adding my script folder to my VSCode workspace. 

If for whatever reason you find the need to update the scriptloader manually (though this should never be necessary), you may either reload Obsidian or use the **Skribi: Reload Scripts** command.

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

<hr>

Additionally, a potentially confusing quirk of CJS module exports is the difference between `module.exports` and `exports`: the former is the actual object, while the latter is a shorthand proxy. You may assign to the properties of both objects and all will export successfully, but if you assign to either of them, this functionality will break. 

For example, `exports = {foo}` or `module.exports = {foo}` will cause `exports` to no longer contribute to the exported module - in this case, only `module.exports` will be exported. However, `exports.foo = foo; module.exports.fum = fum;` will load both `foo` and `fum`. 

For more information about this behavior, see <a href="https://nodejs.org/api/modules.html#modules_exports_shortcut">Module Exports Shortcut</a>. For information about exports in general, see <a href="https://nodejs.org/api/modules.html#modules_module_exports">Module Exports</a>.

## About Script Context

The skribi context is just a teensy bit convoluted, especially if you're not familiar with this part of JS, so here's some extra info.

Firstly, script functions are by default evaluated in their module closure, with no knowledge of the skribi context. Because of this, you do not need to export all of the definitions in your module - only the ones you want to access from skribi (See <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures">Javascript Closures</a> and <a href="https://nodejs.org/api/modules.html#modules_modules_commonjs_modules">CommonJS Modules</a>).

But what if we want to call skribi functions from the script? To easily give a script function access to the skribi context, you can pass the return of `sk.getEnv()` as an argument. In the script, that argument variable will now contain everything you normally have access to: `js`, `int`, etc. For example: `js.func(sk.getEnv())` with the script `function func(obj){console.log(obj.sk.ctx.file.basename)}; module.exports = {func};` will print the filename.

Restricting access is generally good practice, but can be a hassle if you don't care. You can bind a function with `Function.prototype.bind`, like so: `js.func.bind(sk.getEnv())()`. This is similar to passing a variable, but now the function's `this` refers to the skribi env rather than the module. 

If you want to define variables to be available to a script without explicitly passing them, you can store them in the skribi's `this` - which is the same object as `sk.this`, so that it can be accessed from a bound function. For example: `this.x = "foo"; js.func.bind(sk.getEnv())();` with the script `function func(){console.log(this.sk.this.x)}; module.exports = {func};`, will print `"foo"`. If you find the additional `this` annoying, and want it to work just like in a skribi, you can wrap the function's code in a `with(this) {}` block.

It's really up to you how how to design your scripts. When sharing them, you'll want to provide a reference implementation to help others understand how to use them.