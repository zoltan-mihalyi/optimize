console.log([1, 2, 3].length);
console.log([1, 2, 3][0]);
console.log(({
    x: 1
}).x);
console.log(({
    'x': 1
})['x']);
console.log(({
    [["x"]]: 1
})["x"]);
var x;
console.log(({
    [{x:x}]: 1
})["x"]);
console.log(/a/g.global);
console.log(/a/g.ignoreCase);
console.log(typeof [].concat);
console.log(typeof /a/.test);
console.log((function(a, b) {
}).length);
console.log((function x(a) {
}).prototype.constructor.length);

console.log('abc'.length);
console.log('abc'[0]);
console.log(typeof 'abc'.toString);
console.log(typeof true.valueOf);

console.log('x'.toString === 'y'.toString);
console.log({}.toString === {}.toString);
console.log((1).constructor === (0).constructor);
console.log('x'.constructor.constructor === true.constructor.constructor);

console.log('x'.toString === true.toString);
console.log('abc'.toString === {}.toString);
console.log([].toString === {}.toString);

console.log((0).constructor.MAX_VALUE);
console.log(typeof Math.random);

console.log(null.x);