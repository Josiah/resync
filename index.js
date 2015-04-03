'use strict';

var Resync = function Resync(generator) {
  return function start() {
    var ops = [];
    var isRunning = false;

    // Switch the last parameter of this callback with the
    var args = [].slice.call(arguments, 0);
    var last = args.pop();

    args.push(wait);

    var iterator = generator.apply(null, args);

    // Wait generates callbacks which collect arguments and pass them back to
    // the generator
    function wait(options) {
      if (!options) {
        options = {};
      }

      return function next(err) {

        if (err) {
          ops.push(function () {
            if (typeof options.err === 'function') {
              return options.err(err);
            }

            throw err;
          });
        }

        var value = [].slice.call(arguments, 1);

        if (value.length === 1) {
          value = value[0];
        }

        ops.push(function () { return value; });

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

      do {
        var op = ops.shift();
        var current;

        try {
          current = iterator.next(op && op());
        } catch (err) {
          last(err);
          return;
        }

        if (current.done) {
          last(null, current.value);
          return;
        }
      } while (ops.length > 0);

      isRunning = false;
    }

    run();
  };
};

module.exports = Resync;
