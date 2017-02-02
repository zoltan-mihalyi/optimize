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
            var new_a = void 0;
            a = new_a;
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
            continue x2;
        }
        return;
    }
}
hasLabelAndVars(1);