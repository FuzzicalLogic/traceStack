tracestack.js
=============

Get a usable stack trace from anywhere within your code. 

#### Notes:

This project is a heavily fixed, modified and optimized re-tooling of the [stacktrace.js][1] project. For changes, you may refer to the code or [changelog][2]. Before contributing, please read the [contributing guidelines][3].

### Usage (`traceStack()`)

To get a stack trace from anywhere:

    var foo = traceStack([options]);
    
#### Returns

This will return an array of `StackInfo` objects with the following properties:

* `line`: The line of code
* `column`: The column of the code
* `file`: The file that the current code appears in. (Will be anonymous or empty from the console)
* `func`: The name of the function (if it can be determined).

If the stack could not be retrieved in a way that `traceStack` can detect, a string with the reason is returned. Because the code is meant to be used by other code, `traceStack` avoids returning `Error`s.

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
* `mode`: *(Generally unused)* Which environment mode to utilize, if the detected environment is not working correctly. *(May also be used for mocking)* Mode may equal any of the following:
  * `'ie'`
  * `'chrome'`
  * `'firefox'`
  * `'safari'`
  * `'opera9'`, `'opera10a'`, `'opera10b'`, `'opera11'`
  * `'other'` *(Uses arguments.callee & arguments.caller)*
    
### Usage (`traceStack.StackTracer`)

There may be cases where you would like stack information whenever a specific method or property is called. In these cases, `traceStack` also provides a `StackTracer` object that may be used to gather the information when the property or method is accessed.

First get a new Tracer object:

    var tracer = new traceStack.StackTracer;
    
Then, add as many (previously defined) properties and methods to the `Tracer` by calling `trace()`. Tracing a method does not stop the method from firing. Tracing a property will turn the property into a readonly getter with a return value of the value of that property for the time period that it is being traced.

    tracer.trace(object, 'propertyname|methodname', callback);
    
Callbacks have one argument: `stack`. This is a returned array of `StackInfo` objects.

Should you wish to stop tracing and revert to original behavior, simply call the `stop()` method:

    tracer.stop(object, 'propertyname|methodname');
    
    
#### Examples of `StackTracers`

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


[1]: https://github.com/eriwen/javascript-stacktrace
[2]: https://github.com/FuzzicalLogic/traceStack/blob/master/CHANGELOG.md
[3]: https://github.com/FuzzicalLogic/traceStack/blob/master/CONTRIBUTING.md