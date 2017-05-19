console.log(3);
console.log(2);
console.log(0);

console.log("[object Object]");

console.log(true);

console.log(obj["function Boolean() { [native code] }"]);

console.log(true);
console.log(true);
console.log(true);

console.log('a' in 1);
console.log((() => 1) in {});
console.log('create' in Object);

console.log(1 instanceof 1);
console.log(true);
console.log(true);
console.log({} instanceof (() => 0));
console.log(false);
console.log(1 instanceof {});
console.log(false);

var obj = {};
log(true);
clearProto(obj);
log(obj instanceof Object);