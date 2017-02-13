# optimize
JavaScript code optimizer
[![Build Status](https://travis-ci.org/zoltan-mihalyi/optimize.svg?branch=master)](https://travis-ci.org/zoltan-mihalyi/optimize)
[![Code Coverage](https://codecov.io/gh/zoltan-mihalyi/optimize/branch/master/graph/badge.svg)](https://codecov.io/gh/zoltan-mihalyi/optimize)

## usage

```javascript
var optimize = require('optimize');
optimize('console.log(1+1);'); //"console.log(2);"
```