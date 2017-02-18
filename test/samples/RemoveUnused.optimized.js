function fn() {
    console.log("x");

    var b;
    for (b in x) {
    }

    var c;
    c = 2;

    function used() {
    }

    used();
}

function removeMoreUnused() {
    var i;
    i = 1;
}

function keepInit() {
    u();
    var k;
    k = 1;
}