if (12) {
    let i = u ? 1 : 0;
    console.log(i);
}

if(0){
    console.log(0);
}

if ('') {
    console.log(2);
} else {
    console.log(3);
}

if (a) {
    console.log(4);
} else if (42) {
    console.log(5);
} else {
    console.log(6);
}

if (a) {
    console.log(7);
} else if (0) {
    console.log(8);
} else {
    console.log(9);
}

if ([1, 2, 3]) {
    console.log(10);
}

if ([console.log(1)]) {
    console.log(11);
}

if (function() {
    }) {
    console.log(13);
}

var x = 1;
if (u) {
    x = 0;
}
if (x) {
    console.log(14);
}

console.log(1 ? "true" : "false");

if (null) {
    var aaa = 1;
}
console.log(aaa);