'use strict';

var Lab = require('lab');
var Code = require('code');
var Resync = require('../index');
var Bluebird = require('bluebird');

var lab = exports.lab = Lab.script();

lab.experiment('Resync', function () {
  lab.test('syncronous callbacks', function (next) {
    var i = 0;

    var inc = function (cb) {
      return cb(null, ++i);
    };

    var resync = Resync(function * (wait) {
      // In series
      Code.expect(yield inc(wait()), 'iteration 1').to.equal(1);
      Code.expect(yield inc(wait()), 'iteration 2').to.equal(2);

      // In parallel
      inc(wait());
      inc(wait());

      Code.expect((yield), 'iteration 3').to.equal(3);
      Code.expect((yield), 'iteration 4').to.equal(4);

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

    var inc = function (cb) {
      setTimeout(function () {
        return cb(null, ++i);
      }, 0);
    };

    var resync = Resync(function * (wait) {
      // In series
      Code.expect(yield inc(wait()), 'iteration 1').to.equal(1);
      Code.expect(yield inc(wait()), 'iteration 2').to.equal(2);

      // In parallel
      inc(wait());
      inc(wait());

      Code.expect((yield), 'iteration 3').to.equal(3);
      Code.expect((yield), 'iteration 4').to.equal(4);

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
    var run = function (cb) {
      return cb(null, 1, 'one');
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
    var error = function (cb) {
      setTimeout(function () {
        cb(new Error('Error passed to callback'));
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
    var error = function () {
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
    var errorGenerator = function (cb) {
      return cb(error);
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
    var operation1 = function (cb) {
      setTimeout(function () {
        cb(null, result1);
      }, 100);
    };
    var operation2 = function (cb) {
      setTimeout(function () {
        cb(null, result2);
      }, 25);
    };

    var resync = Resync(function * (wait) {
      operation1(wait());
      operation2(wait());

      Code.expect((yield), 'yeild1').to.equal('result1');
      Code.expect((yield), 'yeild2').to.equal('result2');
    });

    resync(next);
  });
  lab.test('yield calls without wait or promise throw an error', function (next) {
    var resync = Resync(function * () { return yield null; });

    resync(function (err) {
      Code.expect(err.message).to.equal('Not awaiting any operations');

      return next();
    });
  });
  lab.test('resync calls without next throw an error', function (next) {
    var resync = Resync(function * () {});

    try {
      resync();
    } catch (err) {
      Code.expect(err.message).to.equal('Final parameter must be a callback');
      return next();
    }
  });
  lab.test('supports non-generator functions', function (next) {
    var resync = Resync(function () { return 'bar'; });

    resync(function (err, result) {
      if (err) {
        return next(err);
      }

      Code.expect(result).to.equal('bar');
      return next();
    });
  });
  lab.test('yields an empty array when no waiting calls present', function (next) {
    var resync = Resync(function * () {
      return yield Array;
    });

    resync(function (err, values) {
      if (err) {
        return next(err);
      }

      Code.expect(values).to.deep.equal([]);

      return next();
    });
  });
  lab.test('`this` is set appropriately', function (next) {
    var obj = {
      resync: Resync(function * () {
        Code.expect(this).to.equal(obj);
      })
    };

    obj.resync(next);
  });
  lab.test('handles callbacks with empty arrays', function (next) {
    var array = [];
    var fn = function (cb) {
      cb(null, array);
    };

    var resync = Resync(function * (wait) {
      return yield fn(wait());
    });

    resync(function (err, value) {
      if (err) {
        return next(err);
      }

      Code.expect(value).to.equal(array);

      return next();
    });
  });
  lab.test('handles callbacks with undefined', function (next) {
    var fn = function (cb) {
      cb(null, undefined);
    };

    var resync = Resync(function * (wait) {
      return yield fn(wait());
    });

    resync(function (err, value) {
      if (err) {
        return next(err);
      }

      Code.expect(value).to.equal(undefined);

      return next();
    });
  });
  lab.test('allows yielding all outstaiding results as an array', function (next) {
    var fn = function (value, cb) {
      setTimeout(function () {
        cb(null, value);
      }, Math.random() * 100);
    };

    var resync = Resync(function * (wait) {
      fn('A', wait());
      fn('B', wait());
      fn('C', wait());

      return yield Array;
    });

    resync(function (err, result) {
      if (err) {
        return next(err);
      }

      Code.expect(result).to.deep.equal(['A', 'B', 'C']);

      return next();
    });
  });
  lab.test('yields first error when yielding an array', function (next) {
    var error = new Error();
    var calls = [];

    var fn = function (value, ms, cb) {
      setTimeout(function () {
        calls.push(value);
        cb(null, value);
      }, ms);
    };

    var fe = function (ms, cb) {
      setTimeout(function () {
        cb(error);
      }, ms);
    };

    var resync = Resync(function * (wait) {
      fn('A', 10, wait());
      fe(15, wait());
      fn('B', 20, wait());
      fn('C', 20, wait());

      return yield Array;
    });

    resync(function (err) {
      Code.expect(err).to.equal(error);
      Code.expect(calls).to.deep.equal(['A']);

      return next();
    });
  });
  lab.experiment('promise handling', function () {
    lab.test('works for successful resolution', function (next) {
      var resync = Resync(function * () {
        var result = yield new Promise(function (resolve) {
          resolve('foo');
        });

        Code.expect(result).to.equal('foo');
      });

      resync(next);
    });
    lab.test('works for rejection', function (next) {
      var resync = Resync(function * () {
        var error = new Error();

        try {
          yield new Promise(function (resolve, reject) {
            reject(error);
          });
        } catch (err) {
          Code.expect(err).to.equal(error);
        }
      });

      resync(next);
    });
  });
  lab.experiment('Bluebird promise handling', function () {
    lab.test('handles bluebird errors', function (next) {
      var error = new Error();
      var p1 = function () {
        return Bluebird.reject(error);
      };

      var resync = Resync(function * () {
        try {
          yield p1();
        } catch (err) {
          Code.expect(err).to.equal(error);
          return;
        }

        throw new Error('Failed to handle bluebird error');
      });

      resync(next);
    });
  });
});
