'use strict';

var Lab = require('lab');
var Code = require('code');
var Resync = require('../index');

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
  lab.test('multiple parameters', function (next) {
    var run = function (next) {
      return next(null, 1, 'one');
    };

    var resync = Resync(function * (wait) {
      var result = yield run(wait());

      Code.expect(result, 'yeilded result is an array of params').to.be.an.array();
      Code.expect(result[0], 'first param is 1').to.equal(1);
      Code.expect(result[1], 'second param is one').to.equal('one');
    });

    resync(next);
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
      throw new Error('Thrown error');
    };

    var resync = Resync(function * (wait) {
      yield error(wait());
    });

    resync(function (err) {
      Code.expect(err, 'error should be passed to final callback').to.exist();
      Code.expect(err.message, 'error should be the right error').to.equal('Thrown error');

      return next();
    });
  });
  lab.test('error squashing via callback handling', function (next) {
    var error = new Error('Error handled by callback');
    var errorGenerator = function (next) {
      return next(error);
    };

    var resync = Resync(function * (wait) {
      var expected = {};
      var result = yield errorGenerator(wait({err: function (err) {
        Code.expect(err, 'error matches thrown error').to.equal(error);

        return expected;
      }}));

      Code.expect(result, 'result is yielded through').to.equal(expected);
    });

    resync(next);
  });
  lab.test('error squashing via callback handling', function (next) {
    var error1 = new Error('First error');
    var error2 = new Error('Second error');
    var errorGenerator = function (next) {
      return next(error1);
    };

    var resync = Resync(function * (wait) {
      var expected = {};
      yield errorGenerator(wait({err: function (err) {
        Code.expect(err, 'error matches thrown error').to.equal(error1);

        throw error2;
      }}));
    });

    resync(function (err) {
      Code.expect(err, 'second error sent throug').to.equal(error2);

      return next();
    });
  });
});
