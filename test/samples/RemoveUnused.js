function fn() {
    var a = console.log("x");

    var b;
    for (b in x) {
    }

    var c;
    c = 2;

    var d;
    var d;

    function used() {
    }

    function unused() {
    }

    function recursive() {
        recursive();
    }

    function called1() {
        called2();
    }

    function called2() {
        called1();
        used();
        (function() {
            called3()
        })();
    }

    function called3() {
    }

    used();
}

fn();