### Version 0.5.0-Alpha

* `traceStack` now has a `monitor` method. This allows the ability to monitor without having to create a `StackTracer`.
* The `StackTracer` method `.trace()` has been renamed to `.monitor()`. This is to keep up with semantics and conform to the `traceStack` method.
* `traceStack.monitor()` and `StackTracer.monitor()` now only require a value to begin monitoring. However, this requires an assignment. The new usage is: `variable = traceStack.monitor(value, callback[, StackTracer]);`
* `StackTracer` objects used to have an ambiguous `run()` method. This has been renamed to `trace()`.
* Monitored values can now be get and set.
* Monitored values and methods now have a `stopMonitoring` method. This allows any variable to be assigned to its return value, including itself.
* `.monitor` performance was signicantly improved.
* Monitored values had the ability to circumvent protections when used maliciously. The information that they use is now localized.
* `StackTracer` objects now have public properties: `limit` (both versions) and `guess` (full version). They are still subject to the same rules. `mode` was not made public to avoid instability.

### Initial Version (0.2)

The project underwent a significant rewrite. Due to the nature of the usage changes, the project name was changed. Below is an accounting of all the the changes.

##### Fixes

* Errored in a local browser environment that was not a localhost (i.e. file:///). Now those who develop without a local server will not feel shamed by `traceStack()`.
* The previous printStackTrace.implementation would allow an undefined object member to be traced, but would not allow proper removal. This now properly errors if the property is not defined.
* Firefox did not return the same number of 'params' in the string (no column). For consistency, we slightly modify the string by adding a ':' to the end.
* Firefox, Chrome and IE8+ now produce the same top entry. 
* Traced object properties (via `StackTracer.trace()`) now return the same top entry as `traceStack()` in Firefox, Chrome and IE. Users and their libraries are now on the same page.
* Traced object properties that were added to multiple StackTracersnow ensure that they are properly unsubscribed from the previous ones. Browsers will be happier when we try and break them.
* While `StackTracer.trace()` properly checked for existing properties, `StackTracer.stop()` did not. This should result in fewer headaches.


##### Additions

* `StackEntry` Class to allow for object usable stack entries.
* Configuration option for `mode`. This allows the user to override the behavior. In general, this should only be used for mocks or unaccounted for environments.
* Configuration option for `limit`. This allows the user to specify the size of the stack that is returned. This does ***not*** modify the stack limit of the of the environment. That is, you can set it to less than the stack limit with positive effect, but trying to raise the limit will only return the entire stack for the environment.
* `StackParser` Class which allows for more structured parsing in particular environments. This results in more efficient scoping and memory. Currently, only IE, Firefox, and Chrome could be abstracted into `StackParsers`. Opera and other environments still use flat functions.

##### Changes

* Renamed `printStackTrace()` to `traceStack()`. This is more semantically correct and does not imply that the output will be put immediately to a rendering agent.
* Renamed `printStackTrace.implementation` to `traceStack.StackTracer`. This gives the proper descriptive usage of the class.
* `StackTracer.trace()` and `StackTracer.stop()` are now chainable.
* `traceStack()` is now simply a short-hand for a single-use `StackTracer`. The toll booth is now open (exact change only).

* Moved to evaluated ClassNames (via `evilClass()`).  This allows for more usable V8 console and debugger inspection, even after minification.

* `StackTracer`s (via `new traceStack.StackTracer()`) now accept options and hold them independently from each other. This allows for different properties to be traced with different configurations.
* `StackTracer.trace()` now allows for any property to be traced, even if it is not a function.
* `StackTracer.stop()` will check if the original property was a value or function. If it was not a function, it will return it back to the original value.
* Traced object properties currently hold a reference to their personal `StackTracer`, so that they don't feel alone.

* Function Name guessing was moved into `StackEntry` and now occurs on `create()`. This includes the functions `guessFunctionName()` *(previously guessAnonymousFunction())*, `isSameDomain()` and `findFunctionName()`.
* Function Name guessing may now be performed at a later date. If `guess` === `false`, a temporary method will be added to the `StackEntry` that will allow an external client library to request the `StackEntry` to guess its function name. This only occurs if the function name is anonymous.

##### Removals

* `guessAnonumousFunctions` was removed as guessing is now done on a per `StackEntry` basis.

##### Access and Stability

* Changed all internally used functions to named local functions. Many of these functions used specially formatted information that could only be provided by other calls in a specific order. By privatizing these, we can better ensure that the methods will not change and will not error at unexpected points.

##### Optimizations

* Moved all Classes to the ClassModule pattern. This reduced checks, unless specifically overridden by the user-provided options.
* Now caches the mode and formatter once, at the class declaration. This may still be overridden by the using script.