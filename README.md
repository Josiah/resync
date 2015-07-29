# Resync

[![Build Status](https://travis-ci.org/Josiah/resync.svg)](https://travis-ci.org/Josiah/resync)
[![Coverage Status](https://coveralls.io/repos/Josiah/resync/badge.svg)](https://coveralls.io/r/Josiah/resync)

## Features

- Node callback management like synchronous code
- Promise support for
  - Native ES6 promises
  - Bluebird

## Usage

### Installation

Install this package using npm:

```sh
npm install --save resync
```

### Examples

#### Database query
```js
var Resync = require('resync');
var Pg = require('postgres');

var loadProducts = Resync(function * (wait) {
  var pg = yield Pg.connect('postgres://username:password@localhost/database', wait());
  var client = pg[0];
  var release = pg[1];

  var result = yield client.query('SELECT * FROM product', wait());

  return result.rows;
});

loadProducts(function (err, products) {
  // Handle those errors & do something with your products
});
```

### Multiple results
```js
var Resync = require('resync');
var Redis = require('redis');

var loadCachedProducts = Resync(function * (ids, wait) {
  var redis = Redis.createClient();

  for (let id of ids) {
    redis.hgetall(`products:${id}`, wait());
  }

  return yield Array;
});
```

### Passing parameters
```js
var Resync = require('resync');
var Pg = require('postgres');

var loadProduct = Resync(function * (id, wait) {
  var pg = yield Pg.connect('postgres://username:password@localhost/database', wait());
  var client = pg[0];
  var release = pg[1];

  var result = yield client.query('SELECT * FROM product WHERE product = ?', [id], wait());

  return result.rows;
});

loadProduct(111, function (err, product) {
  // Handle those errors & do something with your product
});
```

### Handling errors
```js
var Resync = require('resync');
var Fs = require('fs');

var loadProduct = Resync(function * (directory, wait) {
  try {
    return yield Fs.readdir(directory, wait());
  } catch (err) {
    return [];
  }
});

loadProduct('/var/awesome/dir', function (err, files) {
  // Handle those errors or do something with your files
});
```
