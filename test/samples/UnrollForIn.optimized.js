var a;
var b;
console.log(void 0, void 0);

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

    return y + void 0;
}
x();