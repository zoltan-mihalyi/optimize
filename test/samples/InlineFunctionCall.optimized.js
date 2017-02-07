var g, obj, i;

var obj2 = {
        x: 1
    },
    callback = function(key, value) {
        console.log(obj, key, value);
    };

x();
for (var i2 in obj2) {
    callback(i2, obj2[i2]);
}
log(g);

for (var j = 0; j < 2; j++) {
    (function(innerJ) {
        arr[j] = function() {
            return j;
        };
    })(j);
}

function a() {}