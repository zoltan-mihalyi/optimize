function fn() {
    var a = console.log("x");

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