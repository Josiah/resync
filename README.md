# Resync

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
  var files = yield Fs.readdir(directory, wait({
    err: function (err) {
      // Handle your recoverable errors here, then you can either return a value
      // to be yielded or throw an error to be passed on to the callback
      return [];
    }
  }));

  return result.files;
});

loadProduct('/var/awesome/dir', function (err, files) {
  // Handle those errors or do something with your files
});
```
