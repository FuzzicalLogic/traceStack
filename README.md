traceStack
=============

Allows you or your code to get a (re-)usable JavaScript stack trace from within your code or console. It can be configured to guess anonymous function names (when working within a browser) and even limit the number of entries that you recieve. You may additionally create indepent `StackTracers` with different configurations to trace the access of public or priveleged properties.

There are two versions: the full version for debugging environments and the lite version for embedding directly within your own libraries. The most significant difference is that the lite version does not support browsers that do not have useful stack info. This excludes IE9-, Safari 5-, Opera 8- and several other older browsers. If you need to support these, you can try the full version, or use [stacktrace.js][1]. Another important difference is that the lite version does not include the ability to guess anonymous function names.

##### Notes:

`traceStack()` is a heavily modified, fixed and re-optimized re-tooling of the [stacktrace.js][1] project. For changes, you may refer to the code or [changelog][2]. Before contributing, please read the [contributing guidelines][3].

### Usage (`traceStack()`)

To get a stack trace from anywhere:

    var foo = traceStack([{options}]);
    
#### Returns

This will return an array of `StackInfo` objects with the following properties:

* `line`: The line of code
* `column`: The column of the code
* `file`: The file that the current code appears in. (Will be anonymous or empty from the console)
* `func`: The name of the function (if it can be determined).

If the stack could not be retrieved in a way that `traceStack` can detect, a string with the reason is returned instead. Because the code is meant to be used by other code, `traceStack` avoids returning `Error`s unless it cannot do so.

To check if the return is usable:

    if ('string' === typeof foo) { // This is an invalid stack
        console.log(foo)
    }
    
    // OR
    
    if (foo instanceof Array) { // This is a valid stack
        // Do something with the stack
    }

#### Options

* `e`: An object extending `Error` to trace the stack from.
* `guess`: Whether to attempt to guess the names of anonymous functions. *(requires AJAX)*
* `limit`: Whether to limit the number of `StackEntries`. This will accept any positive number greater than `0`. Keep in mind that this does not adjust the stackLimit of the environment you are in.
* `mode`: *(Generally unused)* Which environment mode to utilize, if the detected environment is not working correctly. *(May also be used for mocking)* Mode may equal any of the following:
  * `'ie'`
  * `'chrome'`
  * `'firefox'`
  * `'safari'`
  * `'opera9'`, `'opera10a'`, `'opera10b'`, `'opera11'`
  * `'other'` *(Uses arguments.callee & arguments.caller)*
    
### Usage (`traceStack.StackTracer`)

There may be cases where you would like stack information whenever a specific method or property is called. In these cases, `traceStack` also provides a `StackTracer` object that may be used to gather the information when the property or method is accessed. Additionally, each `StackTracer` can optionally accept the options for `traceStack()`. This allows for different `StackTracers` to differently given circumstance or requirement.

First get a new Tracer object:

    var tracer = new traceStack.StackTracer([options]);
    
Then, add as many (previously defined) properties and methods to the `Tracer` by calling `trace()`. Tracing a method does not stop the method from firing. Tracing a property will turn the property into a readonly getter with a return value of the value of that property for the time period that it is being traced.

    tracer.trace(object, 'propertyname|methodname', callback);
    
Callbacks have one argument: `stack`. This is a returned array of `StackInfo` objects.

Should you wish to stop tracing and revert to original behavior, simply call the `stop()` method:

    tracer.stop(object, 'propertyname|methodname');
    
    
#### Examples of `StackTracers`

##### Single `StackTracer`

The below code defines an object, method and property and adds them to a `StackTracer`. The callback function then outputs the line number of the call whenever the property or method is accessed.

    var widget = {
        foo: 1,
        bar: function() {
            console.log('bar was called');
        }
    };
    
    // Output the current line to the console.
    function printLine(stack) {
        console.log(stack[0].line);
    };
    
    var tracer = new traceStack.StackTracer();
    tracer.trace(widget, 'foo', printLine).trace(widget,'bar',printLine);

##### Multiple `StackTracer`s

This example assumes that you may want only the top level of a stack for some functions, but the full stack for others. It is assumed that the full stack would attempt to resolve function names, but that the top level tracer does not need anonymous functions.

    var widget = {
        foo: 1,
        bar: function() {
            console.log('bar was called');
        }
    };
    
    // Output the current line to the console.
    function printStack(stack) {
        console.log(stack);
    };
    
    var topTracer = new traceStack.StackTracer({limit:1, guess:false}),
		fullTracer = new traceStack.StackTracer();
    topTracer.trace(widget, 'foo', printStack);
	fullTracer.trace(widget, 'bar', printStack);

### Embedding the Lite version

In most cases, embedding the lite version is as simple as placing the code directly within your own module, namespace or class. In some cases, you will want to change the last line `(this)` to refer to different level. This may even be done quite easily with the minified version, though typically you will want to minify it using your minification process instead.

### Why do traceStack not support certain browsers?

As developers, we always have to make these hard decisions. The fact is, frequently, we are extremely supportive of other browsers when it comes to actual production code. This library is for developers who are actively developing or debugging code. Our standards should be set higher when trying to maintain a quality of code and we should be using the tools that are going to make it easier to do our jobs, not harder. A stack is easier; an advanced stack is even more so. Browsers and environments that do not have either of these are detrimental to our process.


[1]: https://github.com/eriwen/javascript-stacktrace
[2]: https://github.com/FuzzicalLogic/traceStack/blob/master/CHANGELOG.md
[3]: https://github.com/FuzzicalLogic/traceStack/blob/master/CONTRIBUTING.md