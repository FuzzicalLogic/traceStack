# When Contributing to this Project

## Do:

* Unit Test your code. If previous tests are provided, validate the previous tests as well.
* If you add functionality, provide an example of usage as well as possible use-cases.
* Document your code using JSDoc Annotations. 
* Also apply `@exports` annotation to anything public so that the code is partially prepared for minification.

## Do Not:

* Change the method of Class declaration. This project uses `evilClass()`ing in a ClassModule pattern. This is done this way to allow for easier debugging (particularly in V8), optimized memory (and in some cases performance), and more re-usable code.

## Conventions

- Only utilize ES5 standardized functionality. *Strict mode compliant where possible*
- Only publicise functions that provide user-requested functionality.
- Fully privatize any function that depends entirely upon internal state or data.
- Make a ClassModule for any standardized return Object.
- Extensions of public classes and functions should maintain chainability where possible.

### ClassModule pattern

The ClassModule pattern is a hybrid of the Namespace/Module, Prototype, and Constructor patterns. It allows for advanced scoping of the Class, while still maintain ES5 standard functionality. Under this pattern, constructors and prototypes have access to locally scoped static functions, which can significantly reduce potential leakage and improve performance. 

##### Notes:

* To see performance statistics of this pattern, see a [comparison at jsPerf][1].
* Object Oriented developers from another background may find this more readable as it clearly denotes public/private, static/object at a glance. 

#### In a Nutshell

    (function(Class) {
        // Static private variables (not functions)
        var staticMember = value;
      
        // Class constructor
        Class.create = function(args){
            // Private object members
            var privateMember = value;
            
            // Public members and methods that should not be prototyped
            this.member = value;
        };
        // Other Static public variables (including functions)
        Class.member = value;
      
        
        Class.prototype = new BaseClass(); // If extending another Class...
        Class.prototype['class'] = Class;
        // Other prototype members here
      
        // Static private functions
        function fnName(args){
        
        }
      
        // Make sure that we get the Class back.
        return Class;
    }(function ClassName(args){
      this['class'].create.apply(this, arguments);
    }));
    
#### Usage

Private Classes use the following convention
    
    var ClassName = ClassModule declaration;
    
Public Classes use the following conventions

    Context.ClassName = ClassModule declaration;
    
    // OR (prefered)
    
    var ClassName = ClassModule declaration;
    Context.ClassName = ClassName;

### `evilClass()`ing

EvilClassing is a small function that evaluates a closure expression and returns a named function for consistent class naming. This significantly improves many aspects of minification and debugging, particularly if developing on the V8 engine.

- Advantages:
  - ES5 Strict mode compatible
  - Objects returned to console and V8 profiler are named accordingly, even after minification.
  - With the ClassModule pattern, standardizes declaration.
  
- Disadvantages:
  - Requires an extra function that cannot be significantly minified.
  - Adds an extra level to the stack during Class declaration.
  - Minorly slows Class declaration down.
  
[1]: http://jsperf.com/class-pattern-comparison/3