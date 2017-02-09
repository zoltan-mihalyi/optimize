var g, obj, i;
function fn() {
    var obj2 = {x: 1};

    var callback = function(key, value) {
        console.log(obj, key, value);
    };

    x();
    for (var i2 in obj2) {
        callback(i2, obj2[i2]);
    }
    log(g);

    for (var j = 0; j < 2; j++) {
        (function(innerJ) {
            arr[j] = function() {
                return j;
            };
        })(j);
    }

    var a1 = 1;
    x();
    var a3 = void 0;
    console.log(a1, a3);
}
(function(x) {
    console.log(x);
})(x);

(function(x) {
    console.log();
})(x);

(function() {
    var x = 1;
    console.log(x);
})();

(function() {
    function inner() {
    }

    console.log(inner());
})();

{
    let x = 1;
    console.log(x);
}

(function() {
    console.log(arguments);
})();

(function() {
    if (a) {
        return console.log(1);
    }
    console.log(2);
})();

console.log(a * a);

console.log((function(a) {
    return a * a
})(a));