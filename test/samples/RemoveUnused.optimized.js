function fn() {
    console.log("x");

    var b;
    for (b in x) {
    }

    var c;
    c = 2;

    function used() {
    }

    used();
}

fn();