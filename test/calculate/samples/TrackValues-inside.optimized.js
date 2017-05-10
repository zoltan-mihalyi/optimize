function trackInside() {
    var b;

    var c;

    if (u) {
        b = function() {
        };
        c = null;
    }

    return () => {
        return [void 0, "function", "object", c, true];
    };
}

function trackInsideMergeBack() {
    var x = 1;
    {
        let a = u;
        x = 2;
        log(a);
    }
    return () => [x, false];
}

function trackInsideMaybe() {
    function a() {
    }

    var b;

    if (u) {
        a = null;
        call(fn);
        a = function() {
        };

        b = function() {
        };
    }
    function fn() {
        return [typeof a, "function"];
    }
}

function trackInsideBranches() {
    function a() {
    }

    var b;

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

    return () => [typeof a, "function"];
}

function dontUseOuter() {
    var dontUseOuter;

    setTimeout(function() {
        dontUseOuter = true;
    });

    return typeof dontUseOuter;
}