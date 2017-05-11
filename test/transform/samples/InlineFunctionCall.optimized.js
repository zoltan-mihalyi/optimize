var g, obj, i;
function fn() {
    var obj2 = {x: function() {}};

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

    x();
    console.log(1, void 0);
}
(function(x) {
    console.log(x);
})(x);

(function(x) {
    console.log();
})(x);

(function() {
    var x = u ? 1 : 0;
    console.log(x);
})();

(function() {
    function inner() {
    }

    console.log(inner());
})();

{
    let x = u ? 1 : 0;
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

console.log((function() {
    return 1;
})(1, a));

console.log(a * a);