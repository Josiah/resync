'use strict';

var Resync = function Resync(generator) {
  return function start() {
    var ops = [];
    var isRunning = false;

    // Switch the last parameter of this callback with the
    var args = [].slice.call(arguments, 0);
    var last = args.pop();

    // Put the last argument back if it's not a function
    if (typeof last !== 'function') {
      throw new Error('Final parameter must be a callback');
    }

    args.push(wait);

    var iterator = generator.apply(null, args);

    // Wait generates callbacks which collect arguments and pass them back to
    // the generator
    function wait() {
      // Waiting calls reserve a position in the list of operations in order to
      // ensure the yield sequence matches the call sequence
      var token = {};
      ops.push(token);

      return function next(err) {
        var index = ops.indexOf(token);

        if (err) {
          ops[index] = function () {
            return iterator.throw(err);
          };
          return run();
        }

        var value = [].slice.call(arguments, 1);

        if (value.length === 1) {
          value = value[0];
        }

        ops[index] = function () {
          return iterator.next(value);
        };

        return run();
      };
    }

    // Run continues the iteration of the generator
    function run() {
      // In the case of immediate callback use the generator may be running in
      // sync mode. This flag prevents double iteration.
      if (isRunning) {
        return;
      }

      isRunning = true;

      while (typeof ops[0] === 'function') {
        var op = ops.shift();
        var current;

        try {
          current = op();
        } catch (err) {
          last(err);
          return;
        }

        if (current.done) {
          last(null, current.value);
          return;
        }
      }

      isRunning = false;
    }

    // First call is a noop
    ops.push(function () { return iterator.next(); });

    run();
  };
};

module.exports = Resync;
