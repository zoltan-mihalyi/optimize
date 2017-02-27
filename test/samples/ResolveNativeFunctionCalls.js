console.log('abc'.toUpperCase());
console.log('abc'.toUpperCase.apply(null));
console.log('abc'.toUpperCase.apply('x'));
console.log('abc'.match(/b/)[0]);
console.log(({}).constructor(2).toString());
console.log([1, 3, 2].concat(2).constructor === [].constructor);
console.log([true.constructor].toString());
console.log(({x: true.constructor}).hasOwnProperty('x'));

console.log(Math.log(Math.E));
console.log(Date());

console.log(typeof Array);

console.log(new Number("123").valueOf());
console.log(new Array(10).length);

console.log(new Date(100).getTime());
console.log(new Date().getTime());

console.log(Object.hasOwnProperty('prototype'));
console.log(({x: 1}).hasOwnProperty('x'));
console.log(Object.hasOwnProperty('create'));
console.log(Object.prototype.toString.call(null));
console.log(/a/.hasOwnProperty('global'));
console.log(new Function('return typeof Object.create')());
console.log(eval('1+1'));

console.log(Function.prototype.apply.call(function(){}));
console.log((function(){}).apply(Date));

console.log(Array.prototype.push(1));
console.log(Array.prototype.push.apply(Object.prototype, [1]));