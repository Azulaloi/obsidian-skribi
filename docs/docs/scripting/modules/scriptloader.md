# Scriptloader

Any `js` files inside the directory configured in the **Script Directory** setting (path relative to vault) will be loaded by Skribi and made available within the local context under the `s` object. 

Declare the exports with `module.exports = exports`, where exports is either: a function, or an object containing functions, ex: `module.exports = {foo, fum}`. 

If only one function is exported, it will exist as `s.x()` where `x` is the name of the **file**. If multiple functions are exported, they will exist *in* `s.x`, ex: `s.x.foo(), s.x.fum()`.    