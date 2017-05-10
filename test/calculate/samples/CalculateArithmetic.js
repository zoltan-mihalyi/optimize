console.log(1 + 1);
console.log(2 * 3);
console.log(1 - 'a');
console.log(1 / 0);
console.log(1 + '');
console.log(2 == '2');
console.log(2 === '2');
console.log(null + 1);
console.log(1.2 >> 0);
console.log('' + void 42);
console.log(1 + function() {});

console.log(!1);
console.log(+'1');
console.log(-'1');
console.log(typeof 'a');
console.log(void 42);
console.log(![]);
console.log(![err()]);
console.log(void []);
console.log(typeof []);
console.log(typeof {});
console.log(typeof function() {});
console.log(!function() {});
console.log(void function() {});
console.log(+function() {});
console.log(typeof fn);
function fn() {
    console.log(typeof arguments);
}
console.log(typeof arguments);

console.log(1 + a);
console.log(0 || null || 2);

console.log(1 + ({}).constructor(2));
console.log(2 - []);
console.log(-u);

console.log(1 === {});
console.log(1 !== {});
console.log({} === []);

console.log(1 == {});
console.log(Math === 1);
console.log(function(){} == 1);

console.log(typeof {
    x: console.log()
});
console.log(typeof {
    [console.log()]: 1
});
console.log(typeof ({
    x:function() {
    }
}).x);
console.log(typeof [function() {}][0]);
console.log(typeof ({
    [function() {}]: 1
}));
console.log(typeof {x: this});

console.log(-0);
console.log(-[]);
