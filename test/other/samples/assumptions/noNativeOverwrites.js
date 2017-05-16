console.log(1 + ({}).constructor(2));
console.log(2 - []);
console.log(+[]);

console.log(({}).toString());

console.log(Object.hasOwnProperty('prototype'));

Math.random;

console.log(obj[true.constructor]);

console.log({} instanceof Object);
console.log('toString' in []);
console.log('toString' in (() => 0));

console.log('a' in 1);
console.log(() => 1 in {});
console.log('create' in Object);

console.log(1 instanceof 1);
console.log((() => 0) instanceof Function);
console.log((() => 0) instanceof Object);
console.log({} instanceof (() => 0));
console.log({} instanceof Function);
console.log(1 instanceof {});
console.log(1 instanceof Number);

var obj = {};
log(obj instanceof Object);
clearProto(obj);
log(obj instanceof Object);