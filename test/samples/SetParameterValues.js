function fn() {
    function singleValue(a) {
        return a + 1;
    }

    console.log(singleValue(1));


    function newCall(a) {
        return a;
    }

    new newCall(1);


    function optional(a) {
        return !a;
    }

    console.log(optional(0));
    console.log(optional());


    function withoutParam(p) {
        return p;
    }

    console.log(withoutParam());


    function untrackable(p) {
        return p;
    }

    console.log(untrackable(1));
    untrackable.call(null, 2);


    function untrackable2(p) {
        return p;
    }

    function otherScope2() {
        untrackable2(1);
    }

    otherScope2();
    setTimeout(untrackable2);


    function untrackable3(p) {
        return p;
    }

    function otherScope3() {
        setTimeout(untrackable3);
    }

    otherScope3();
    untrackable3(1);


    function innerScope() {
        if (u) {
            function a(p) {
                return p;
            }
        }
        console.log(a(1));
    }

    innerScope();


    var functionExpression = function(param) {
        return param === 0;
    };
    console.log(functionExpression(0));


    function recursive(a) {
        console.log(a);
        console.log(a < 3);
        recursive(2);
    }

    recursive(1);


    setTimeout(function() {
        ref2(2);
    });
    function anotherReferenceUsedOutside(p) {
        console.log(p);
        console.log(p < 3);
    }

    anotherReferenceUsedOutside(1);
    var ref2 = anotherReferenceUsedOutside;


    var obj = {x: 1};

    function objectParameter(p) {
        console.log(p.x);
    }

    objectParameter(obj);
    obj.x = 2;


    var obj2 = {x: 1};

    function objectParameterChanging(p) {
        console.log(p.x);
        console.log(p.x < 3);
    }

    objectParameterChanging(obj2);
    obj2.x = 2;
    objectParameterChanging(obj2);


    function moreObjectParameters(p) {
        console.log(p.x);
        console.log(p.x < 3);
    }

    moreObjectParameters({x: 1});
    moreObjectParameters({x: 2});


    function moreObjectInSingleCall(a, b) {
    }

    moreObjectInSingleCall({}, {});
}

function global(p) {
    return p;
}
global(1);