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
    
#### Stack Strings

To get a Stack String from the array, simply call `toString(message)` on the result. This will produce a standardized stack trace string similar to what you would find in Chrome. If you include the optional `message` parameter, it will be included in the stack string.

For example, `getStack().toString()` would produce output similar to the following:

    at functionName: (myscript.js:1:30)
	at {anonymous}: (myscript.js:24:27)

In contrast, `getStack().toString('Stack was retrieved') would produce output similar to:

    Stack was retrieved at
	    at functionName: (myscript.js:15:74)
		at functionName: (myotherscript.js:156:12)
		at eval code

#### `StackTracer`s

When you call `traceStack()`, it conveniently creates a one-use `StackTracer` and runs its `trace()` method. There are several circumstances where reusing a `StackTracer` might be beneficial. To alleviate this, `traceStack` allows you to store a reference to a `StackTracer` object. This allows you to reuse the `StackTracer` with the same configuration without having to construct a new object over and over again.

    var tracer = new trace.StackTracer({option});

The `StackTracer` has its own `trace()` method so that you may run it whenever you would like.

    tracer.trace();

Additionally, you may use this `StackTracer` to monitor variable, properties and functions. The `monitor` method is discussed below.

##### Public Properties

* `limit`: The maximum levels of the stack to retrieve.
* `guess`: Whether to automatically guess anonymous function names.

##### Public Methods

* `trace()`: Uses this `StackTracer`'s options to run a stack trace.
* `monitor(value, callback)`: Uses this `StackTracer`'s options to monitor a variable/property access or function calls. See more on monitoring below.

### Usage (`traceStack.monitor`)

There may be cases where you would like stack information whenever a variable or property has been accessed or when a function or method has been called. In these cases, `traceStack` also provides a `monitor()` function. This will replace the variable, property or function with a functionally wrapped version. Depending upon your needs, there are several ways to start monitoring...

On the fly:

    // Any of the below will work
    var monitored = traceStack(value, function(stack) { });
    object.monitored = traceStack(value, function(stack) { });

With a special configuration:

    // Any of the below will work
    var monitored = new traceStack.StackTracer({limit:1}).monitor(value, function(stack){ });
    object.monitored = new traceStack.StackTracer({limit:1}).monitor(value, function(stack){ });
    var monitored = traceStack.monitor(value, function(stack){ }, new traceStack.StackTracer({limit:1}));
    object.monitored = traceStack.monitor(value, function(stack){ }, new traceStack.StackTracer({limit:1}));

Or with a shared `StackTracer` object:

    var tracer = new traceStack.StackTracer({limit:1});

    // Any of the below will work
    var monitored = tracer.monitor(value, function(stack){ });
    object.monitored = tracer.monitor(value, function(stack){ });
    var monitored = traceStack.monitor(value, function(stack){ }, tracer);
    object.monitored = tracer.monitor(value, function(stack){ });

For use in libraries, the returned monitor also provides a `stopMonitoring` method. This method technically simply returns the unmodified value. However, in order to allow for detection it has been named accordingly. In order to get a reference to an unmodified version:

    var unmonitored = monitored.stopMonitoring();

To stop monitoring the value completely:

    monitored = monitored.stopMonitoring();

#### Important Note:

When you begin monitoring a value that is not a function or method, that value now becomes a unified getter/setter until it is no longer monitored. This means that it must be accessed in the following way:

To get the value:

    monitor();

To set the value:

    monitored(newValue);

If the monitored value is initially a function, you may access it as you normally would. This even includes methods that use `this`.
### Embedding the Lite version

In most cases, embedding the lite version is as simple as placing the code directly within your own module, namespace or class. In some cases, you will want to change the last line `(this)` to refer to different level. This may even be done quite easily with the minified version, though typically you will want to minify it using your minification process instead.

#### Why does traceStack Lite not support certain environments?

As developers, we always have to make these hard decisions. The fact is, frequently, we are extremely supportive of other browsers when it comes to actual production code. This library is for developers who are actively developing or debugging code. If a browser does not have a error stack, then we have to use non strict mode methods of finding that information. This means that strict mode libraries cannot embed the Lite version due to the way that strict mode works.

[1]: https://github.com/eriwen/javascript-stacktrace
[2]: https://github.com/FuzzicalLogic/traceStack/blob/master/CHANGELOG.md
[3]: https://github.com/FuzzicalLogic/traceStack/blob/master/CONTRIBUTING.md