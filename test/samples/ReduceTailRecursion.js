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
    if (x) {
        var a = x;
    }
    if (a) {
        console.log(a);
    }
    return hasVars();
}

hasVars(1);