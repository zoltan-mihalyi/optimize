import Map = require("./Map");

const SafeProperties:Map<Object,string[]> = new Map<Object, string[]>();
SafeProperties.set(Object.prototype, [
    'constructor',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
    'toString',
    'valueOf'
]);
SafeProperties.set(Object, ['prototype']);
SafeProperties.set(Function.prototype, ['constructor', 'length', 'apply', 'call', 'toString']);
SafeProperties.set(Function, ['prototype']);
SafeProperties.set(Array.prototype, [
    'constructor',
    'length',
    'toString',
    'toLocaleString',
    'join',
    'pop',
    'push',
    'reverse',
    'shift',
    'unshift',
    'slice',
    'splice',
    'sort',
    'concat'
]);
SafeProperties.set(Array, ['prototype']);
SafeProperties.set(Number.prototype, [
    'constructor',
    'toExponential',
    'toFixed',
    'toLocaleString',
    'toPrecision',
    'toString',
    'valueOf'
]);
SafeProperties.set(Number, ['prototype', 'MAX_VALUE', 'MIN_VALUE', 'NaN', 'NEGATIVE_INFINITY', 'POSITIVE_INFINITY']);
SafeProperties.set(Boolean.prototype, ['constructor', 'toString', 'valueOf']);
SafeProperties.set(Boolean, ['prototype']);
SafeProperties.set(String.prototype, [
    'constructor',
    'length',
    'charAt',
    'charCodeAt',
    'lastIndexOf',
    'localeCompare',
    'substr',
    'substring',
    'toString',
    'valueOf',
    'concat',
    'indexOf',
    'match',
    'replace',
    'search',
    'slice',
    'split',
    'toLowerCase',
    'toLocaleLowerCase',
    'toUpperCase',
    'toLocaleUpperCase'
]);
SafeProperties.set(String, ['prototype']);
SafeProperties.set(RegExp.prototype, [
    'constructor',
    'exec',
    'test',
    'toString',
    'compile',
    'global',
    'ignoreCase',
    'multiline',
    'source'
]);
SafeProperties.set(RegExp, ['prototype']);
SafeProperties.set(Math, [
    'abs',
    'acos',
    'asin',
    'atan',
    'atan2',
    'ceil',
    'cos',
    'exp',
    'floor',
    'log',
    'max',
    'min',
    'pow',
    'random',
    'round',
    'sin',
    'sqrt',
    'tan',
    'E',
    'LN10',
    'LN2',
    'LOG10E',
    'LOG2E',
    'PI',
    'SQRT1_2',
    'SQRT2'
]);
SafeProperties.set(Date, ['length', 'arguments', 'caller', 'prototype', 'parse', 'UTC']);
SafeProperties.set(Date.prototype, [
    'constructor',
    'toString',
    'toDateString',
    'toTimeString',
    'toUTCString',
    'getDate',
    'setDate',
    'getDay',
    'getFullYear',
    'setFullYear',
    'getHours',
    'setHours',
    'getMilliseconds',
    'setMilliseconds',
    'getMinutes',
    'setMinutes',
    'getMonth',
    'setMonth',
    'getSeconds',
    'setSeconds',
    'getTime',
    'setTime',
    'getTimezoneOffset',
    'getUTCDate',
    'setUTCDate',
    'getUTCDay',
    'getUTCFullYear',
    'setUTCFullYear',
    'getUTCHours',
    'setUTCHours',
    'getUTCMilliseconds',
    'setUTCMilliseconds',
    'getUTCMinutes',
    'setUTCMinutes',
    'getUTCMonth',
    'setUTCMonth',
    'getUTCSeconds',
    'setUTCSeconds',
    'valueOf',
    'toLocaleString',
    'toLocaleDateString',
    'toLocaleTimeString'
]);

export = SafeProperties;