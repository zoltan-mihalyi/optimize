var a;
var b;
console.log(a, b);

var i = "x";
console.log("x");
var i = "y";
console.log("y");
console.log("0");
console.log("1");
i = "0";
console.log("0");
i = "1";
console.log("1");
i = "0";
console.log("0");

i = "1";
console.log("1");

function x() {
    function y() {
    }

    var z;
    return y + z;
}
x();