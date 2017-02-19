console.log("ABC");
console.log('abc'.toUpperCase.apply(null));
console.log("X");
console.log("b");
console.log("2");
console.log(true);
console.log("function Boolean() { [native code] }");
console.log(true);

console.log(1);
console.log(Date());

console.log("function");

console.log(123);
console.log(10);

console.log(Array.prototype.push(1));
console.log(Array.prototype.push.apply(Object.prototype, [1]));

console.log(100);
console.log(new Date().getTime());

console.log(true);
console.log(true);
console.log(Object.hasOwnProperty('create'));
console.log(Object.prototype.toString.call(null));
console.log(/a/.hasOwnProperty('global'));
console.log(new Function('return typeof Object.create')());
console.log(eval('1+1'));

console.log(Function.prototype.apply.call(function(){}));
console.log((function(){}).apply(Date));