for (var a in null) {
    var b;
}
console.log(a, b);

for (var i in {x: 1, y: 3}) {
    console.log(i);
}

for (let i in 'ab') {
    console.log(i);
}

for (i in [1, 2]) {
    console.log(i);
}

for (i in [1, 2])
    console.log(i);

for (let i in []) {
    function x() {
        function y() {
        }

        var z;
        return y + z;
    }
}
x();