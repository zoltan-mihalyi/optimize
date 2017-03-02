function track() {
    var obj = {x: 0};
    obj.x = 1;
    console.log(1);
    if (u) {
        obj.x = 2;
        console.log(2);
    }
    console.log(obj.x);
    console.log(true);
    console.log(true);
}

function trackNewObject() {
    var o = {x: 1};
    if (u) {
        o = {x: 2};
    }
    console.log(o.x);
    console.log(true);
}

function trackBranch() {
    var o;
    if (u) {
        o = {x: 1};
    } else {
        o = {x: 2};
    }
    console.log(o.x);
    console.log(true);
}

function trackUpdate() {
    var obj = {x: 1};
    obj.x++;
    console.log(2);
}

function trackUnsureReference() {
    var a = {x: 0};
    var b = {x: 0};
    var c = a;
    if (u) {
        c = b;
    }
    console.log(0);
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
    console.log(true);
}

function known() {
    console.log(1);
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
    while (u) {
        arr.push(1);
    }
    console.log(arr.length);
}

function trackAnotherScope() {
    var a = {x: 1};
    var b = a;

    call(() => {
        b.x = 2;
    });

    console.log(a.x);
}