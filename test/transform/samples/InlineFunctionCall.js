var g, obj, i;
function fn() {
    (function eachObj(obj, callback) {
        for (var i in obj) {
            callback(i, obj[i]);
        }
        log(g);
    })({x: function() {}}, function(key, value) {
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
    var x = u ? 1 : 0;
    console.log(x);
})();

(function() {
    function inner() {
    }

    console.log(inner());
})();

(function() {
    let x = u ? 1 : 0;
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

console.log((function() {
    return a * a
})());

console.log((function(a) {
    return a * a
})(a));

console.log((function() {
    return 1;
})(1, a));

console.log((() => a * a)());

function nameCollisionExpression() {
    var a = {x: 1};

    function getA() {
        return a;
    }

    function inner() {
        var a = {x: 2};
        log(a);
        return getA();
    }

    return inner;
}

function nameCollisionStatement() {
    var a = {a: 1};
    var b = {b: 1};

    function logAB(c) {
        var b = {b: 2};
        log(a);
        log(b);
        log(c);
    }

    function inner(c) {
        var a = {a: 2};
        log(a);
        log(b);
        logAB({});
        return c;
    }

    return inner;
}

function blockScopeNameCollision() {
    var x = {};

    function b(p) {
        let x = {x: 1};
        log(x);
        log(p);
    }

    b(x);
}

function doubleReplace() {
    function first() {
        log('first');
    }

    function second() {
        log('second');
    }

    function third(log) {
        first();
        second();
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
    function inlinable(){
        log(1, innerReturner);

        function innerReturner() {
            return 1;
        }
    }

    inlinable();
}

function inlineExpression(){
    var fn = function() {
        log(1);
    };

    fn();
}

function inlineNonExpression() {
    function fn(p) {
        if (u) {
            return;
        }
        return p;
    }

    return fn(3);
}

function inlineNonExpressionWithoutReturn(){
    function fn(){
        log(1);
        log(2);
    }

    if(u) {
        return fn();
    }
    log(3);
}

function inlineWithLabel(){
    function fn(){
        x:{
            if (u) {
                return 1;
            }
            log(1);
            break x;
        }
    }

    return fn();
}

function callNonFunction(){
    var o = {}; //complicate to avoid IDE warning
    var fn = o;

    return fn();
}

function inlineNonExpressionResultCollision(){
    function fn1() {
        var result = u;
        if(u1) {
            return 1;
        }
        return result;
    }
    function fn2() {
        if(u2) {
            return 1;
        }
    }

    fn1();
    fn2();
}