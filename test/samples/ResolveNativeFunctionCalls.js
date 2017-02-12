console.log('abc'.toUpperCase());
console.log('abc'.toUpperCase.apply(null));
console.log('abc'.toUpperCase.apply('x'));
console.log('abc'.match(/b/)[0]);
console.log(({}).constructor(2).toString());
console.log([1, 3, 2].sort().constructor === [].constructor);
console.log([true.constructor].toString());
console.log(({x: true.constructor}).hasOwnProperty('x'));

console.log(Math.log(Math.E));
console.log(Date());

console.log(typeof Array);