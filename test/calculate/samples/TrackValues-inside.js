function trackInside() {
    var a;

    function b() {
    }

    var c;

    if (u) {
        b = function() {
        };
        c = null;
    }

    return () => {
        return [a, typeof b, typeof arguments, c, c == null];
    };
}

function trackInsideMergeBack() {
    var x = 1;
    {
        let a = u;
        x = 2;
        log(a);
    }
    return () => [x, x === 'a'];
}

function trackInsideMaybe() {
    function a() {
    }

    function b() {
    }

    if (u) {
        a = null;
        call(fn);
        a = function() {
        };

        b = function() {
        };
    }
    function fn() {
        return [typeof a, typeof b];
    }
}

function trackInsideBranches() {
    function a() {
    }

    function b() {
    }

    if (u) {
        a = 1;
        a = function() {
        };

        b = function() {
        };
    } else {
        a = 1;
        a = function() {
        };

        b = function() {
        };
    }

    return () => [typeof a, typeof b];
}

function dontUseOuter() {
    var dontUseOuter;

    setTimeout(function() {
        dontUseOuter = true;
    });

    return typeof dontUseOuter;
}