var g, obj, i;
function fn() {
    (function eachObj(obj, callback) {
        for (var i in obj) {
            callback(i, obj[i]);
        }
        log(g);
    })({x: 1}, function(key, value) {
        console.log(obj, key, value);
    }, x());

    for (var j = 0; j < 2; j++) {
        (function(innerJ) {
            arr[j] = function() {
                return j;
            };
        })(j);
    }

    (function() {
        function a() {
            var b = 1;
        }
    })();

    (function(a1, a2, a3) {
        console.log(a1, a3);
    })(1, x());
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

(function() {
    let x = 1;
    console.log(x);
})();

(function() {
    console.log(arguments);
})();

(function() {
    if (a) {
        return console.log(1);
    }
    console.log(2);
})();
console.log((function(a) {
    return a * a
})(6));