function factorial(i, prod) {
    if (i === 0) {
        return prod;
    } else {
        return factorial(i - 1, prod * i);
    }
}

factorial(3, 1);

function calledMultipleTimes(a) {
    if (a) {
        return calledMultipleTimes(a - 1);
    } else if (a === 0) {
        return calledMultipleTimes();
    } else {
        return 0;
    }
}
calledMultipleTimes(2);

function noParam() {
    return noParam();
}
noParam();

function cannotReduce() {
    cannotReduceInner();
    function cannotReduceInner() {
        return cannotReduce();
    }
}
cannotReduce();

function hasLabelAndVars(a, a2) {
    var new_a = u();
    x:
    for (var i = 0; i < 2; i++) {
        return hasLabelAndVars(a + new_a + 1, a2 + 1);
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
    return hasVars();

    function inner(i0) {
        var i1 = {};
        return [i0, i1];
    }
}

hasVars(1);

var notADeclaration = function() {
    return notADeclaration();
}

function noBlock(n) {
    x:while (1)
        return noBlock(n - 1);
}

function noLoop() {
    x:if (u) {
        return noLoop();
    }
}

function overwritten() {
    return overwritten();
}
overwritten = null;