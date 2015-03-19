'use strict';

var Resync = function Resync(generator) {
  return function start() {

    var calls = [];
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
          if (typeof options.err !== 'function') {
            return last(err);
          }

          try {
            calls.push([options.err(err)]);
          } catch (thrownErr) {
            return last(thrownErr);
          }
        }

        calls.push([].slice.call(arguments, 1));

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
        try {
          var call = calls.shift();

          if (call && call.length > 1) {
            call = [call];
          }

          var current = iterator.next.apply(iterator, call);

          if (current.done) {
            last(null, current.value);
            return;
          }
        } catch (err) {
          last(err);
          return;
        }
      } while (calls.length > 0);

      isRunning = false;
    }

    run();
  };
};

module.exports = Resync;
