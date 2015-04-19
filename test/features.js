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
      setTimeout(function () {
        next(new Error('Error passed to callback'));
      }, 5);
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
  lab.test('in place error support', function (next) {
    var expected = {};
    var error = new Error('Error handled by callback');
    var errorGenerator = function (next) {
      return next(error);
    };

    var resync = Resync(function * (wait) {
      try {
        yield errorGenerator(wait());
      } catch (err) {
        Code.expect(err, 'error is thrown in place').to.equal(err);
      }

      return expected;
    });

    resync(next);
  });
  lab.test('out of order asyncronous operations', function (next) {
    var result1 = 'result1';
    var result2 = 'result2';
    var operation1 = function (next) {
      setTimeout(function () {
        next(null, result1);
      }, 100);
    };
    var operation2 = function (next) {
      setTimeout(function () {
        next(null, result2);
      }, 25);
    };

    var resync = Resync(function * (wait) {
      operation1(wait());
      operation2(wait());

      Code.expect(yield, 'yeild1').to.equal('result1');
      Code.expect(yield, 'yeild2').to.equal('result2');
    });

    resync(next);
  });
  lab.test('resync calls without next throw an error', function (next) {
    var resync = Resync(function * (actual1, wait) {});

    try {
      resync();
    } catch (err) {
      Code.expect(err.message).to.equal('Final parameter must be a callback');
      return next();
    }
  });
  lab.test('throws an error when passed function is not a generator', function (next) {
    try {
      Resync(function (wait) {});
    } catch (err) {
      Code.expect(err.message).to.equal('Resync function must be a generator');
      return next();
    }

    return next(new Error('Resync should have thrown for non-generator'));
  });
});
