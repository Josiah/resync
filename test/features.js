'use strict';

var Lab = require('lab');
var Code = require('code');
var Resync = require('resync');

var lab = exports.lab = Lab.script();

lab.experiment('Resync', function () {
  lab.test('syncronous callbacks', function (next) {
    var i = 0;

    var inc = function (next) {
      return next(null, ++i);
    };

    var resync = Resync(function * (wait) {
      // In series
      Code.expect(yield inc(wait()), 'iteration 1').to.equal(1);
      Code.expect(yield inc(wait()), 'iteration 2').to.equal(2);

      // In parallel
      inc(wait());
      inc(wait());

      Code.expect(yield, 'iteration 3').to.equal(3);
      Code.expect(yield, 'iteration 4').to.equal(4);

      return 'foo';
    });

    resync(function (err, value) {
      if (err) {
        return next(err);
      }


      Code.expect(value, 'returned result').to.equal('foo');
      Code.expect(i, 'iteration result').to.equal(4);

      return next();
    });
  });
  lab.test('asyncronous callbacks', function (next) {
    var i = 0;

    var inc = function (next) {
      setTimeout(function () {
        return next(null, ++i);
      }, 0);
    };

    var resync = Resync(function * (wait) {
      // In series
      Code.expect(yield inc(wait()), 'iteration 1').to.equal(1);
      Code.expect(yield inc(wait()), 'iteration 2').to.equal(2);

      // In parallel
      inc(wait());
      inc(wait());

      Code.expect(yield, 'iteration 3').to.equal(3);
      Code.expect(yield, 'iteration 4').to.equal(4);

      return 'foo';
    });

    resync(function (err, value) {
      if (err) {
        return next(err);
      }

      Code.expect(value, 'returned result').to.equal('foo');
      Code.expect(i, 'iteration result').to.equal(4);

      return next();
    });
  });
  lab.test('callback error handling', function (next) {
    var error = function (next) {
      return next(new Error('Error passed to callback'));
    };

    var resync = Resync(function * (wait) {
      yield error(wait());
    });

    resync(function (err) {
      Code.expect(err, 'error should be passed to final callback').to.exist();
      Code.expect(err.message, 'error should be the right error').to.equal('Error passed to callback');

      return next();
    });
  });
  lab.test('thrown error handling', function (next) {
    var error = function (next) {
      throw new Error('Error passed to callback');
    };

    var resync = Resync(function * (wait) {
      yield error(wait());
    });

    resync(function (err) {
      Code.expect(err, 'error should be passed to final callback').to.exist();
      Code.expect(err.message, 'error should be the right error').to.equal('Error passed to callback');

      return next();
    });
  });
});
