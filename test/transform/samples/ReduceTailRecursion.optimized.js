function factorial(i, prod) {
    x:
    while (1) {
        if (i === 0) {
            return prod;
        } else {
            var new_i = i - 1, new_prod = prod * i;
            i = new_i;
            prod = new_prod;
            continue x;
        }
        return;
    }
}

factorial(3, 1);

function calledMultipleTimes(a) {
    x:
    while (1) {
        if (a) {
            var new_a = a - 1;
            a = new_a;
            continue x;
        } else if (a === 0) {
            a = void 0;
            new_a = void 0;
            continue x;
        } else {
            return 0;
        }
        return;
    }
}
calledMultipleTimes(2);

function noParam() {
    x:
    while (1) {
        continue x;
        return;
    }
}
noParam();

function cannotReduce() {
    cannotReduceInner();
    cannotReduceInner();
    function cannotReduceInner() {
        return cannotReduce();
    }
}
cannotReduce();

function hasLabelAndVars(a, a2) {
    x2:
    while (1) {
        var new_a = u();
        x:
        for (var i = 0; i < 2; i++) {
            var new_a2 = a + new_a + 1, new_a22 = a2 + 1;
            a = new_a2;
            a2 = new_a22;
            new_a = void 0;
            i = void 0;
            continue x2;
        }
        return;
    }
}
hasLabelAndVars(1);

function usesArguments() {
    if (arguments.length === 1) {
        return usesArguments();
    }
    return 0;
}
usesArguments();

function hasVars(x) {
    x:
    while (1) {
        let b;
        if (x) {
            var a = x;
            b = x;
            function c(){
            }
        }
        if (a) {
            console.log(a, b, c, inner);
        }
        x = void 0;
        a = void 0;
        c = void 0;
        inner = void 0;
        continue x;

        function inner(i0) {
            var i1 = {};
            return [i0, i1];
        }
        return;
    }
}

hasVars(1);

var notADeclaration = function() {
    return notADeclaration();
}

function noBlock(n) {
    x:while (1) {
        var new_n = n - 1;
        n = new_n;
        continue x;
    }
}

function noLoop() {
    x2:
    while (1) {
        x:if (u) {
            continue x2;
        }
        return;
    }
}

function overwritten() {
    return overwritten();
}
overwritten = null;