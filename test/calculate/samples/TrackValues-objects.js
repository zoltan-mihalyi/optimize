function track() {
    var obj = {x: 0};
    obj.x = 1;
    console.log(obj.x);
    if (u) {
        obj.x = 2;
        console.log(obj.x);
    }
    console.log(obj.x);
    console.log(obj.x < 3);
    console.log(obj.x > 0);
}

function trackNewObject() {
    var o = {x: 1};
    if (u) {
        o = {x: 2};
    }
    console.log(o.x);
    console.log(o.x < 3);
}

function trackBranch() {
    var o;
    if (u) {
        o = {x: 1};
    } else {
        o = {x: 2};
    }
    console.log(o.x);
    console.log(o.x < 3);
}

function trackUpdate() {
    var obj = {x: 1};
    obj.x++;
    console.log(obj.x);
}

function trackUnsureReference() {
    var a = {x: 0};
    var b = {x: 0};
    var c = a;
    if (u) {
        c = b;
    }
    console.log(c.x);
    c.x = 1;
    console.log(a.x, b.x);
}

function trackLeakReference() {
    var a = {x: 0};
    var b = [a];
    b[u].x = 1;
    console.log(a.x);
}

function trackMethodCall() {
    var obj = {
        x: 1,
        setX: function(x) {
            this.x = x;
        }
    };
    obj.setX(2);
    console.log(obj.x);
}

function trackFunctionCall() {
    var obj = {
        x: 1
    };
    setX(obj, 2);
    console.log(obj.x);
}

function trackUnaryOperator() {
    var obj = {
        x: 1,
        valueOf: function() {
            this.x = 2;
        }
    };
    +obj;
    console.log(obj.x);
}

function trackBinaryOperator() {
    var obj = {
        x: 1,
        toString: function() {
            this.x = 2;
        }
    };
    obj + '';
    console.log(obj.x);
}

function trackArray() {
    var arr = [];
    if (u) {
        arr.push('a');
    }
    console.log(arr.length);
    console.log(arr.length < 2);
}

function trackArrayMultiChange() {
    var arr = [];
    arr.push(1);
    arr.push(1);
    return arr.length;
}

function trackArrayRecursive() {
    var a1 = [];
    var a2 = [];
    a1.push(a2);
    a2.push(a2);
    a2.push(a1);
    a1.push(a2);
    return a1[0] === a2 && a2[1] === a1;
}

function known() {
    var obj = {x: 1};
    var obj2 = obj;
    console.log(obj2.x);
}

function unknown() {
    var orig = {};
    var other = orig;
    if (u) {
        other = u;
    }
    other.x = 1;
    console.log(orig.x);
}

function unknown2() {
    var orig = {};
    var other = u;
    if (u) {
        other = orig;
    }
    other.x = 1;
    console.log(orig.x);
}

function trackUnsure() {
    var arr = [];
    var arr2;
    try {
        err();
        arr2 = arr;
        arr2.push(1);
    } catch (e) {
    }
    console.log(arr.length);
}

function trackLoop() {
    var arr = [];
    var arr2 = [];
    while (u) {
        arr2.push(1);
        arr2 = arr;
    }
    console.log(arr.length);
}

function trackLoopWithNewRef() {
    var arr = [];
    while (u) {
        arr.push(1);
        arr = [];
    }
    console.log(arr.length);
}

function trackLoopWithNewRefNewVar() {
    var arr = [];
    while (1) {
        var arr = [];
    }
    return arr;
}

function trackAnotherScope() {
    var a = {x: 1};
    var b = a;

    call(() => {
        b.x = 2;
    });

    console.log(a.x);
}

function trackNoSetter() {
    var a = (/a/); //parens to avoid IDE error
    a.global = true;
    return a.global;
}

function trackNonWritable(){
    function fn(){}

    fn.length = 42;
    return fn.length;
}

function trackArrayProperties(){
    var a = [];

    a.length = '1';
    log(a.length);
    a[4] = 1;
    log(a.length);

    a = [1];
    a.length = 0;
    log(a[0]);
}

function trackCanBeSetter() {
    var a = {};
    a.x = 1;
    return a.x;
}

function trackNonEnumerable() {
    function fn() {
    }

    fn.prototype = {};
    for (var i in fn) {
        log(i);
    }
}

function knownCallDoesNotMakeObjectDirty() {
    var a = [1];
    a.push.apply(a, [2, 3]);
    return a.length;
}

function trackDeleteNone() {
    var o = {
        y: 1
    };
    delete o.x;
    log(o.y);
}

function trackDelete() {
    var o = {
        x: 1,
        y: 1
    };
    delete o.x;
    log(o.y, o.hasOwnProperty('x'), o.x);
}

function trackDeleteNonConfigurable() {
    var o = [];
    delete o.length;
    log(o.length);
}

function trackDeleteNoTrueValue() {
    var o = {
        x: 1,
        y: () => 1
    };
    delete o.x;
    log(typeof o.y);
}

function trackProtoAssignment() {
    log(typeof {
        __proto__: null
    }.toString);

    log(typeof {
        ['__proto__']: null
    }.toString);

    log(typeof {
        [PROTO]: null
    }.toString);
}