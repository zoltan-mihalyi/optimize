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