function trackSimple() {
    console.log(1);
}

function trackInner() {
    if (u) {
        console.log(1);
    }
}

function trackUpdate() {
    var x = 1;
    x++;
    console.log(2);
    x--;
    console.log(1);
    x=function() {
    };
    x++;
    console.log(x);
}

function trackUpdate2() {
    var x = 1;
    x+=1;
    console.log(2);
    x+=function() {
    };
    console.log(x);
}

function trackObject() {
    var o1 = {x: 1};
    console.log("object");
    console.log(o1.x);
}

function trackBranch1() {
    var x = 1;
    if (u) {
        x = 2;
    }
    console.log(true);
}

function trackBranch2() {
    var x = 0;
    if (u) {
        x = 1;
    } else {
        x = 2;
    }
    console.log(true);
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

    var y = 1;
    for (; ;) {
        y++;
        break;
    }
    console.log(y);
}

function trackLoopTest() {
    var x1 = 1;
    while (x1--) {
    }
    console.log(x1);

    var x2 = 1;
    for (x2 = 0; u;) {
    }
    console.log(0);

    var x3 = 1;
    for (; x3-- < 10;) {
    }
    console.log(x3);

    var x4 = 1;
    for (; x4 > 0; x4++) {
    }
    console.log(x4);

    var x5 = 1;
    do {
    } while (x5--);
    console.log(x5);
}

function trackTryCatch() {
    var x = 1;
    try {
        u();
        x = 2;
    } catch (e) {

    }
    console.log(x);
    throw (x = 3, console.log(3), new Error("!"));
}

function trackTryFinally() {
    var x = 1;
    try {
        x = 2;
    } finally {
        x = 3;
    }
    console.log(3);
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
        let j = u();
        console.log(j, j);
    }
    console.log(1);
}

function trackVarInLoop() {
    var i = 0;

    while (true) {
        console.log(i);
        i++;
    }
}

function trackInsideAssignment() {
    u[1] = log(1);
    var j = 2;
    u(j = 3).x++;
    log(3);
}

function trackForeachObject() {
    var i = 1;
    for (var j in {x: i++}) {
    }
    console.log(2);
}

function trackDeclarators() {
    var i = 1, j = i++;
    console.log(2, j);
}

console.log(2);

function trackArrow() {
    if (u) {
        return x => (x = 1, console.log(1));
    } else {
        return x => {
            x = 1;
            console.log(1);
        };
    }
}

function mergeElse() {
    var x;
    if (u) {
        if (u) {
            u();
        } else {
            x = true;
        }
    } else {
        x = true;
    }

    console.log(x, y);
}

function trackSwithc() {
    var i = 1, j = 2, k = 3;
    switch (u) {
        case 1:
            i++;
        case 2:
            j = 3;
            break;
        default:
            k = 4;
    }
    console.log(i, j, k);
}