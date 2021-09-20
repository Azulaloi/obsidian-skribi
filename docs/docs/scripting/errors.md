# Misc

## Embeds



## Recursion



## Error Handling

By throwing an error or calling `sk.abort()`, the execution of the skribi function is aborted and an error element is rendered with the error message as a tooltip, like any other error.

## Async

If the compiled string contains `await` anywhere, the template function will be compiled to a promise. While awaiting the resolution of the template function, a placeholder element will be rendered.