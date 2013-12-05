/** 
 * @license Public Domain by Donald Atkinson (aka FuzzicalLogic)
 */

/* 
 * This is a heavily modified, fixed and optimized version of the public domain
 * project printStackTrace.js. The project was renamed because the nature of the
 * changes require some significant changes to usage.
 *
 * Fix: Errored in a local browser environment that was not a localhost (i.e.
 *    file:///
 * Fix: Output had to re-parsed externally to provide usable information.
 * Fix: When the mode supplied is not an included formatter, defaults to the 
 *    cached formatter.
 * Fix: The previous printStackTrace.implementation would allow an undefined
 *    object member to be traced, but would not allow proper removal. This now
 *    properly errors if the property is not defined.
 *
 * Change: Renamed printStackTrace() to traceStack(). This is more semantically
 *    correct and does not imply that the output will be put immediately to a 
 *    rendering agent.
 * Change: Renamed printStackTrace.implementation to traceStack.StackTracer. This
 *    gives the proper descriptive usage of the class.
 * Change: StackTracer.trace() and StackTracer.stop() are now chainable.
 * Change: Moved to evaluated ClassNames (via 'evilClass()').  This allows for 
 *    more usable V8 console and debugger inspection, even after minification.
 * Change: StackTracer.trace() now allows for any property to be traced, even if 
 *    it is not a function.
 * Change: StackTracer.stop() will check if the original property was a value or
 *    function. If it was not a function, it will return it back to the original
 *    value.
 *
 * Added: StackInfo Class to allow for object usable stack entries.
 * Added: Configuration option for 'mode'. This allows the user to override the
 *    behavior. In general, this should only be used for mocks or unaccounted for
 *    environments.
 *
 * Stability: Changed all internally used functions to named local functions. 
 *    Many of these functions used specially formatted information that could 
 *    only be provided by other calls in a specific order. By privatizing these,
 *    we can better ensure that the methods will not change and will not error
 *    at unexpected points.
 * 
 * Optimization: Moved all Classes to the ClassModule pattern. This reduced
 *    checks, unless specifically overridden by the user-provided options.
 * Optimization: Now caches the mode and formatter once, at the class declaration.
 *    This may still be overridden by the using script.
 *
 * TODO: Add internal and external unit tests.
 */
/* global module, exports, define */
(function(global) {
    /** 
     * Creates the returned object. This is provided internally to allow for
     * use of internally shared functions. 
     * 
     * @return {(function|object)}
     */
    function factory() {
        if (Object.freeze)
            Object.freeze(traceStack);
        return traceStack;
    }

    /** 
     * Gets the stack and converts it to an Array of StackInfo objects. The 
     * original version used strings, but external parsing of them should not
     * be required. Additionally, the function was renamed to a more semantically
     * correct version. 'printStackTrace' implied that the return value was to
     * be output for some type of rendering.
     * 
     * @cfg {Error} e The error to trace the stack from. (optional) @default <null> 
     * @cfg {boolean} guess Whether to attempt to resolve the names of anonymous
     *    functions. (optional) @default <true>
     * @cfg {string} mode Which formatting mode to utilize. This is primarily used 
     *    for forcing behavior in environments that may not be accounted for.
     * @return {(Array.<StackInfo>|string)} If traceStack failed, it will send
     *     back readable text rather than Error. This gives a checkable condition
     *     for success or failure.
     *
     * @example traceStack()
     * @example traceStack({e: error})
     */
    function traceStack(options) {
        options = options || { guess: true };
        var ex = options.e || null;

        return new traceStack.StackTracer(options).run(ex);
    }

    var StackParser = (function(Class) {
        /**
         *
         */
        Class.create = function(options) {
            var myCfg = options || {},
                key = myCfg.key || 'stack',
                pre = myCfg.pre || [],
                parsers = myCfg.parsers || [],
                post = myCfg.post || function(stack) { return stack; };

            this.parse = myCfg.parse || function(e, limit) {
                // Must have the specified property
                if (!e[key]) throw new TypeError();

                // Inline all of the calls (no chance for error)
                // parse(pre) -> applyLimit -> parse(parsers) -> post(result.split)
                return post(parsePhase(applyStackLimit(parsePhase(e[key], pre), limit), parsers).split('\n'));
            }
        }

        /** 
         * Checks the error object for individual stack-related properties. Due 
         * to a lack of standardization of the stack, we can only determine the
         * proper method by these properties.
         *
         * @param {Error} e - An error object that has already been thrown.
         * @return {string}
         */
        Class.autodetect = function(e) {
            if (e.stack) {
                if (e['arguments'])
                    return 'chrome';
                else if (e.sourceURL)
                    return 'safari';
                else if (e.number)
                    return 'ie';
                else if (e.fileName)
                    return 'firefox';
                else if (e.message && e.stacktrace) {
                    if (e.stacktrace.indexOf("called from line") < 0)
                        return 'opera10b';
                    return 'opera11';
                }
                else if (!e.fileName)
                    return 'chrome';
            }
            else if (e.message && e['opera#sourceloc']) {
                if (!e.stacktrace)
                    return 'opera9';
                if (e.message.indexOf('\n') > -1 && e.message.split('\n').length > e.stacktrace.split('\n').length) {
                    return 'opera9';
                }
                return 'opera10a';
            }
            return 'other';
        }

        Class.prototype['class'] = Class;

        function parsePhase(stack, expressions) {
            var out = stack,
                expr, i = -1, max = expressions.length;

            while (++i < max && (expr = expressions[i])) {
                out = out.replace(expr[0], !!!expr[1] ? '' : expr[1]);
            }
            return out;
        }

        function applyStackLimit(stack, limit) {
            return !!!limit ? stack : stack.split(/\r\n|[\n\r\u2028\u2029]/g).slice(0, limit + 1).join('\n');
        }

        return Class;
    }(evilClass('StackParser')));

    var /** @const {string} Replacement for anonymous functions.*/
        ANON = '{anonymous}',
        /** @const {RegExp} The proper RegEx for finding new lines. */
        NEW_LINES = /\r\n|[\n\r\u2028\u2029]/g,

        sourceCache = {},
        /**
         * Enum for formatting functions based on localized environment (often
         * a browser). All formatters reformat to functionName@fileUrl:line:column.
         *
         * @readonly
         * @enum {function}
         */
        formatters = {
            chrome: new StackParser({
                pre: [[/^[\s\S]+?\s+at\s+/, ' at ']],
                parsers: [
                    [/^\s+(at eval )?at\s+/gm],
                    [/^([^\(]+?)([\n$])/gm, ANON + '() ($1)$2'],
                    [/^Object.<anonymous>\s*\(([^\)]+)\)/gm, ANON + '() ($1)'],
                    [/^(.+) \((.+)\)$/gm, '$1@$2']
                ]
            }),
            safari: new StackParser({
                pre: [[/\[native code\]\n/m] , [/^(?=\w+Error\:).*$\n/m]],
                parsers: [[/^@/gm, ANON + '()@']]
            }),
            ie: new StackParser({
                pre: [[/^\s*at\s+(.*)$/gm, '$1']],
                parsers: [
                    [/^Anonymous function\s+/gm, ANON + '() '],
                    [/^(.+)\s+\((.+)\)$/gm, '$1@$2']
                ],
                post: function(stack) { return stack.slice(1) }
            }),
            firefox: new StackParser({
                pre: [[/(?:\n@:0)?\s+$/m]],
                parsers: [[/^(?:\((\S*)\))?@/gm, ANON + '($1)@']],
                post: function(stack){ return stack.map(function(v, k, a) { return v + ':'; }) }
            }),

            opera11: function(e, limit) {
                if (!e.stacktrace) throw new TypeError();

                var match,
                    lineRE = /^.*line (\d+), column (\d+)(?: in (.+))? in (\S+):$/;
                var lines = e.stacktrace.split(NEW_LINES), result = [];

                //Gets rid of all odd lines.
                lines.map(function(v, k, a) { return k % 2 == 0 ? v : '' });

                for (var i = 0, len = lines.length; i < len; i += 2) {
                    if (lines[i] !== '' && (match = lineRE.exec(lines[i]))) {
                        var fnName = match[3] || "global code";
                        fnName = fnName.replace(/<anonymous function: (\S+)>/, "$1").replace(/<anonymous function>/, ANON);
                        result.push(fnName + '@' + match[4] + ':' + match[1] + ':' + match[2]);
                    }
                }

                return result;
            },

            opera10b: function(e, limit) {
                if (!e.stacktrace) throw new TypeError();

                var match,
                    results = [],
                    lineRE = /^(.*)@(.+):(\d+)$/,
                    lines = e.stacktrace.split(NEW_LINES);

                // Initialize loop vars
                var i = -1, max = lines.length;
                while (++i < max) {
                    // Account for limit option.
                    if (!!limit && results.length < limit) break;

                    match = lineRE.exec(lines[i]);
                    if (match) {
                        var fnName = match[1] ? (match[1] + '()') : "global code";
                        result.push(fnName + '@' + match[2] + ':' + match[3] + ':');
                    }
                }

                return result;
            },

            opera10a: function(e, limit) {
                if (!e.stacktrace) throw new TypeError();

                var match,
                    result = [],
                    lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i,
                    lines = e.stacktrace.split(NEW_LINES);
                //Gets rid of all odd lines.
                lines.map(function(v, k, a) { return k % 2 == 0 ? v : '' });

                // Initialize loop vars
                var i = -2, max = lines.length;
                while ((i += 2) < max) {
                    // Account for limit option.
                    if (!!limit && results.length < limit) break;

                    if (lines[i] !== '' && (match = lineRE.exec(lines[i]))) {
                        var fnName = match[3] || ANON;
                        result.push(fnName + '()@' + match[2] + ':' + match[1] + ':');
                    }
                }

                return result;
            },

            opera9: function(e, limit) {
                if (!e.message) throw new TypeError();

                var match,
                    result = [],
                    lines = e.message.split(NEW_LINES),
                    lineRE = /Line (\d+).*script (?:in )?(\S+)/i;

                //Gets rid of all odd lines.
                lines.map(function(v, k, a) { return k % 2 == 0 ? v : '' });

                // Initialize loop vars
                var i = -2, max = lines.length;
                while ((i += 2) < max) {
                    // Account for limit option.
                    if (!!limit && results.length < limit) break;

                    if (lines[i] !== '' && (match = lineRE.exec(lines[i])))
                        result.push(ANON + '()@' + match[2] + ':' + match[1] + ':');
                }

                return result;
            },

            other: function(curr, limit) {
                var fnRE = /function\s*([\w\-$]+)?\s*\(/i, stack = [], fn, args, 
                    maxStackSize = (!!limit && limit < 10) ? limit : 10;
                while (curr && curr['arguments'] && stack.length < maxStackSize) {
                    fn = fnRE.test(curr.toString()) ? RegExp.$1 || ANON : ANON;
                    args = Array.prototype.slice.call(curr['arguments'] || []);
                    stack[stack.length] = fn + '(' + stringifyArguments(args) + ')@::';
                    curr = curr.caller;
                }
                if (stack.length < maxStackSize)
                    stack.push('global code@::')
                return stack;
            }
        };



    /** 
     * An automatic tracer to get a stack trace each time a given object property 
     * is accessed.
     *
     * @expose 
     */
    traceStack.StackTracer = (function(Class) {
        var /** Caches the mode when the class is run. (We can only run in 
             * one browser per instance.)
             *
             * @type {string}
             */
            ourMode = StackParser.autodetect(createException()),
            /** Caches the Formatter when the class is run. (We can only run in 
             * one browser per instance.)
             *
             * @type {function}
             */
            ourFormatter = formatters[ourMode];

        /** @expose */
        Class.create = function(options) {
            // Handle options internally, so that each StackTracer may have it owns options.
            var myCfg = options || {},
                myGuess = ('undefined' === typeof myCfg.guess)
                        ? true
                        : !!myCfg.guess,
                myLimit = (myCfg.limit && myCfg.limit > 0) 
                        ? myCfg.limit
                        : 0,
                myMode = ((!!myCfg.mode) && (myCfg.mode in formatters))
                       ? myCfg.mode
                       : ourMode,
                myFormatter = (myMode === ourMode)
                            ? ourFormatter
                            : formatters[myMode];
            
            /** 
             *
             * @param {Error} ex The error to use when tracing. If not provided,
             *    traceStack will create one internally.
             * @expose 
             */
            this.run = function(ex) {
                var out,
                    // We only chop the beginning if we generate the error...
                    shift = !!ex ? 0 : 3,
                    // This will be passed to the parser function...
                    limit = !!!myLimit ? 0 : myLimit + shift,
                    err = myMode === 'other'
                        ? arguments.callee.caller.caller
                        : !!ex
                            ? ex
                            : createException();

                try {
                    out = ('function' === typeof myFormatter ? myFormatter(err, limit) : myFormatter.parse(err, limit));
                    if (myMode === 'other') {
                        out = !!!myLimit ? out : out.slice(0, myLimit)
                    }
                    else {
                        out = !!!myLimit ? out.slice(shift) : out.slice(shift, limit)
                    }
                    out = out.map(function(v, k, a) { return new StackEntry(v, myGuess) });
                    // Allow user to get a user-readable string
                    out.toString = function(msg) { return (msg ? msg + '\n\t' : '') + this.join('\n\t') };
                }
                catch (e) {
                    out = 'traceStack may not be configured to work properly with this environment';
                }
                return out;
            };

        };

        /** @expose */
        Class.prototype = {
            'monitor': function(value, callback) {
                return new StackMonitor(value, callback, this);
            },
        };
        Object.defineProperty(Class.prototype, 'constructor', {
            value:Class,
            writable: false
        });

        /** 
         * Creates an exception guaranteed to give stack info and immediately 
         * catches and returns it. 
         *
         * @return {Error}
         */
        function createException() { try { Class.undef(); } catch (e) { return e; } }

        return Class;
    }(evilClass('StackTracer')));

    /**
     * An Object containing the location information of a given stack entry.
     * Since the format in guaranteed by the formatter functions, we rely on
     * this to parse into an object.
     */
    var StackEntry = (function StackInfo(Class) {
        /**
         * @param {string} line A line pre-formatted by an internal formatter.
         *
         * @constructor
         */
        Class.create = function(line, guess) {
            if ('string' !== typeof line && !(line instanceof String))
                throw new TypeError('New StackInfo instances require a valid string.')
            var tmp = line.split('@'),
                loc = tmp.pop(),
                func = tmp.join('@'),
                tmp2 = loc.split(':'),
                col = tmp2.pop(),
                line = tmp2.pop(),
                file = tmp2.join(':');

            /** @expose */this.file = file;
            /** @expose */this.line = line;
            /** @expose */this.column = col;

            /** @todo Make this async(?) */
            if (guess && func === ANON+'()') {
                func = guessFunctionName(this);
            }
            // Support for guessing at a later date.
            else if (func === ANON+'()') {
                this.guess = function() {
                    var func = guessFunctionName(this);
                    // Only guess once. If it fails, later attempts will not resolve it.
                    this.func = (!!func) ? func : ANON;
                    delete this.guess;
                    return this;
                };
            }
            /** @expose */this.func = (!!func) ? func : ANON;
        };

        Object.defineProperty(Class.prototype, 'constructor', {
            value:Class,
            writable: false
        });
        /** 
         * Gets a user-readable string representation of the StackEntry
         *
         * @return {string}
         * @expose 
         */
        Class.prototype.toString = function() {
            return 'at ' + this.func + (this.file ? ' (' + this.file + (this.line ? ':' + this.line : '') + (this.line ? ':' + this.column : '') + ')' : '');
        };

        /**
         *
         * @param {StackEntry} The entry to find the function for.
         * @return {(string|boolean)} The function's name or False if it could not be found.
         */
        function guessFunctionName(entry) {
            var file = entry.file,
                line = entry.line,
                col = entry.column;
            
            if (!!file && isSameDomain(file) && line) {
                try {
                    return findFunctionName(getSource(file), line);
                }
                catch (e) {
                    ;
                }
            }
            return false;
        }

        /**
         * Given a URL, check if it is in the same domain to determine if we can use
         * AJAX to get the source code. The previous version would return true and 
         * cause an error if the protocol was not an allowable AJAX protocol.
         *
         * @param {string} url URL of the file to check
         * @return {boolean} True if we can make an AJAX request
         */
        function isSameDomain(url) {
            // location is not defined in some local environments
            // AJAX is only supported for the http: protocol
            return typeof location !== "undefined"
                && (location.protocol === 'http:' || location.protocol === 'https:')
                && url.indexOf(location.hostname) !== 1;
        }

        function findFunctionName(source, lineNo) {
            // FIXME findFunctionName fails for compressed source
            // (more than one function on the same line)
            // function {name}({args}) m[1]=name m[2]=args
            var reFunctionDeclaration = /function\s+([^(]*?)\s*\(([^)]*)\)/;
            // {name} = function ({args}) TODO args capture
            // /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*function(?:[^(]*)/
            var reFunctionExpression = /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*function\b/;
            // {name} = eval()
            var reFunctionEvaluation = /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*(?:eval|new Function)\b/;
            // Walk backwards in the source lines until we find
            // the line which matches one of the patterns above
            var code = "", line, maxLines = Math.min(lineNo, 20), m, commentPos;
            for (var i = 0; i < maxLines; ++i) {
                // lineNo is 1-based, source[] is 0-based
                line = source[lineNo - i - 1];
                commentPos = line.indexOf('//');
                if (commentPos >= 0) {
                    line = line.substr(0, commentPos);
                }
                // TODO check other types of comments? Commented code may lead to false positive
                if (line) {
                    code = line + code;
                    m = reFunctionExpression.exec(code);
                    if (m && m[1]) {
                        return m[1];
                    }
                    m = reFunctionDeclaration.exec(code);
                    if (m && m[1]) {
                        return m[1];
                    }
                    m = reFunctionEvaluation.exec(code);
                    if (m && m[1]) {
                        return m[1];
                    }
                }
            }
            return '(?)';
        }

        return Class;
    }(evilClass('StackEntry')));

    var StackMonitor = (function(Class){
        Class.create = function(value, callback, tracer) {
            var myInstrumentation;

            if ('function' !== typeof callback)
                throw new TypeError('Callback must be a valid function')
            if (!(arguments[arguments.length - 1] instanceof traceStack.StackTracer))
                tracer = new traceStack.StackTracer;

            if (value.stopMonitoring)
                value = value.stopMonitoring();

            myInstrumentation = 'function' === typeof value ? value : accessor;
            Object.defineProperty(monitor, 'stopMonitoring', {
                configurable: false,
                value: stopMonitoring
            });
            return monitor;

            function monitor() {
                callback.call(this, tracer.run());
                return myInstrumentation.apply(this, arguments);
            }

            function accessor(newValue) {
                if ('undefined' !== typeof newValue)
                    value = newValue;
                return value;
            }

            function stopMonitoring() {
                return value;
            }
        };
        
        Object.defineProperties(Class.prototype, { 
            'constructor': {
                value:Class,
                writable: false
            }
        });

        return Class;
    }(evilClass('StackMonitor')));
    traceStack.StackMonitor = StackMonitor;
    /**
    * Given arguments array as a String, substituting type names for non-string types.
    *
    * @param {(Arguments|Array)} args
    * @return {String} stringified arguments
    */
    function stringifyArguments(args) {
        var result = [];
        var slice = Array.prototype.slice;
        for (var i = 0; i < args.length; ++i) {
            var arg = args[i];
            if (arg === undefined) {
                result[i] = 'undefined';
            } else if (arg === null) {
                result[i] = 'null';
            } else if (arg.constructor) {
                if (arg.constructor === Array) {
                    if (arg.length < 3) {
                        result[i] = '[' + stringifyArguments(arg) + ']';
                    } else {
                        result[i] = '[' + stringifyArguments(slice.call(arg, 0, 1)) + '...' + stringifyArguments(slice.call(arg, -1)) + ']';
                    }
                } else if (arg.constructor === Object) {
                    result[i] = '#object';
                } else if (arg.constructor === Function) {
                    result[i] = '#function';
                } else if (arg.constructor === String) {
                    result[i] = '"' + arg + '"';
                } else if (arg.constructor === Number) {
                    result[i] = arg;
                }
            }
        }
        return result.join(',');
    }

    /**
    * Get source code from given URL if in the same domain. 
    *
    * @param url <String> JS source URL
    * @return <Array> Array of source code lines
    */
    function getSource(url) {
        // TODO reuse source from script tags?
        if (!(url in sourceCache)) {
            sourceCache[url] = ajax(url).split('\n');
        }
        return sourceCache[url];
    }

    /**
     * @return the text from a given URL
     */
    function ajax(url) {
        var req = createXMLHTTPObject();
        if (req) {
            try {
                req.open('GET', url, false);
                //req.overrideMimeType('text/plain');
                //req.overrideMimeType('text/javascript');
                req.send(null);
                //return req.status == 200 ? req.responseText : '';
                return req.responseText;
            } catch (e) {
            }
        }
        return '';
    }

    /**
    * Try XHR methods in order and store XHR factory.
    *
    * @return <Function> XHR function or equivalent
    */
    function createXMLHTTPObject() {
        var xmlhttp,
            XMLHttpFactories = [
                function() {
                    return new XMLHttpRequest();
                }, function() {
                    return new ActiveXObject('Msxml2.XMLHTTP');
                }, function() {
                    return new ActiveXObject('Msxml3.XMLHTTP');
                }, function() {
                    return new ActiveXObject('Microsoft.XMLHTTP');
                }
            ];
        for (var i = 0; i < XMLHttpFactories.length; i++) {
            try {
                xmlhttp = XMLHttpFactories[i]();
                // Use memoization to cache the factory
                createXMLHTTPObject = XMLHttpFactories[i];
                return xmlhttp;
            } catch (e) {
            }
        }
    }

    /** 
     * Creates and returns a eval'd named ClassModule function.
     *
     * This function is necessary to allow for proper object names in the V8 
     * engine. While this would work without evaling, the class name would be
     * minified when it came time to reduce. This bypasses the minifier, still
     * allowing the rest of the code to be minified.
     *
     * @param {string} name The name of the class to create the function for.
     */
    function evilClass(name) {
        return eval('(function(){'
                + 'return function ' + name + '(){'
                    + 'return this.constructor.create.apply(this,Array.prototype.slice.call(arguments))'
                + '}'
            + '}());');
    }

    if (typeof exports === 'object') {
        // Node
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(factory);
    } else {
        // Browser globals
        global.traceStack = factory();
    }
}(this));