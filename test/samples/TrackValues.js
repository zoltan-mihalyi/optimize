function trackSimple() {
    var x = 1;
    console.log(x);
}

function trackInner() {
    var xaa = 1;
    if (u) {
        console.log(xaa);
    }
}

function trackUpdate() {
    var x = 1;
    x++;
    console.log(x);
}

function trackObject() {
    var o1 = {x: 1};
    console.log(typeof o1);
    console.log(o1.x);
}

function trackBranch1() {
    var x = 1;
    if (u) {
        x = 2;
    }
    console.log(x < 3);
}

function trackBranch2() {
    var x = 0;
    if (u) {
        x = 1;
    } else {
        x = 2;
    }
    console.log(x > 0);
}

function trackBranchWithBreak() {
    var x = 0;
    a:if (u1) {
        if (u2) {
            break a;
        }
        x = 1;
    } else {
        x = 2;
    }
    console.log(x > 0);
}

function trackLoopBody() {
    var x = 1;
    var i = 1;
    for (var i in u) {
        x++;
    }
    console.log(i);
    console.log(x);
}

function trackLoopTest() {
    var x1 = 1;
    while (x1--) {
    }
    console.log(x1);

    var x2 = 1;
    for (x2 = 0; u;) {
    }
    console.log(x2);

    var x3 = 1;
    for (; x3-- < 10;) {
    }
    console.log(x3);

    var x4 = 1;
    for (; x4 > 0; x4++) {
    }
    console.log(x4);
}

function trackTryCatch() {
    var x = 1;
    try {
        u();
        x = 2;
    } catch (e) {

    }
    console.log(x);
}

function trackTryFinally() {
    var x = 1;
    try {
        x = 2;
    } finally {
        x = 3;
    }
    console.log(x);
}

function trackFunctionUpdate() {
    var x = 1;
    add();
    console.log(x);

    function add() {
        x++;
    }
}

function trackVarInBlock() {
    {
        var i = 1;
        let j = u();
        console.log(j, j);
    }
    console.log(i);
}

function trackVarInLoop() {
    var i = 0;

    while (true) {
        console.log(i);
        i++;
    }
}

function trackInsideAssignment() {
    var i = 1;
    u[i] = log(i);
    var j = 2;
    u(j = 3).x++;
    log(j);
}

function trackForeachObject() {
    var i = 1;
    for (var j in {x: i++}) {
    }
    console.log(i);
}

function trackDeclarators() {
    var i = 1, j = i++;
    console.log(i, j);
}

(function trackInFunctionExpression() {
    var z = 2;
    console.log(z);
})();