var g, obj, i;

(function eachObj(obj, callback) {
    for (var i in obj) {
        callback(i, obj[i]);
    }
    log(g);
})({x: 1}, function(key, value) {
    console.log(obj, key, value);
}, x());

for (var j = 0; j < 2; j++) {
    (function(innerJ) {
        arr[j] = function() {
            return j;
        };
    })(j);
}

( function() {
    function a() {
        var b = 1;
    }
} )();