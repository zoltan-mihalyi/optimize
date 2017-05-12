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
    let x2 = u ? 1 : 0;
    console.log(x2);
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

function nameCollisionExpression() {
    var a = {x: 1};

    function inner() {
        var a2 = {x: 2};
        log(a2);
        return a;
    }

    return inner;
}

function nameCollisionStatement() {
    var a = {a: 1};
    var b = {b: 1};

    function inner(c) {
        var a2 = {a: 2};
        log(a2);
        log(b);
        var c2 = {};
        var b2 = {b: 2};
        log(a);
        log(b2);
        log(c2);
        return c;
    }

    return inner;
}

function blockScopeNameCollision() {
    var x = {};

    {
        var p = x;
        let x2 = {x: 1};
        log(x2);
        log(p);
    }
}

function doubleReplace() {
    function third(log2) {
        log('first');
        log('second');
    }

    return third;
}

function handleThis(){
    function getGlobal(){
        return this;
    }

    return {
        timeout: function(fn, ms) {
            return getGlobal().setTimeout(fn, ms);
        }
    };
}

function inlineWithInnerReturn(){
    log(1, innerReturner);

    function innerReturner() {
        return 1;
    }
}

function inlineExpression(){
    log(1);
}