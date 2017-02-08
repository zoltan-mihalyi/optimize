console.log(obj[0]);
console.log(obj["1,2"]);
console.log(obj["function Boolean() { [native code] }"]);
console.log(obj[{
    toString: 1
}]);
console.log(obj[{
    toString: {}.constructor
}]);