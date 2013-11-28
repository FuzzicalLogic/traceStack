### Initial Version

The project underwent a significant rewrite. Due to the nature of the usage changes, the project name was changed. Below is an accounting of all the the changes.

##### Fixes

* Fix: Errored in a local browser environment that was not a localhost (i.e. file:///)
* Fix: Output had to re-parsed externally to provide usable information.
* Fix: When the mode supplied is not an included formatter, defaults to the cached formatter.
* Fix: The previous printStackTrace.implementation would allow an undefined object member to be traced, but would not allow proper removal. This now properly errors if the property is not defined.
* Fix: Firefox did not return the same number of 'params' in the string (no column). For consistency, we slightly modify the string by adding a ':' to the end.

##### Changes

* Renamed printStackTrace() to traceStack(). This is more semantically correct and does not imply that the output will be put immediately to a rendering agent.
* Renamed printStackTrace.implementation to traceStack.StackTracer. This gives the proper descriptive usage of the class.
* StackTracer.trace() and StackTracer.stop() are now chainable.
* Moved to evaluated ClassNames (via 'evilClass()').  This allows for more usable V8 console and debugger inspection, even after minification.
* StackTracer.trace() now allows for any property to be traced, even if it is not a function.
* StackTracer.stop() will check if the original property was a value or function. If it was not a function, it will return it back to the original value.

##### Additions

* StackInfo Class to allow for object usable stack entries.
* Configuration option for 'mode'. This allows the user to override the behavior. In general, this should only be used for mocks or unaccounted for environments.

##### Access and Stability

* Changed all internally used functions to named local functions. Many of these functions used specially formatted information that could only be provided by other calls in a specific order. By privatizing these, we can better ensure that the methods will not change and will not error at unexpected points.

##### Optimizations

* Moved all Classes to the ClassModule pattern. This reduced checks, unless specifically overridden by the user-provided options.
* Now caches the mode and formatter once, at the class declaration. This may still be overridden by the using script.