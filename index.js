'use strict';

function isPromise(value) {
  if (typeof value !== 'object') {
    return false;
  }

  if (value === null) {
    return false;
  }

  if (typeof value.then === 'function' && typeof value.catch === 'function') {
    return true;
  }

  return false;
}

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

    var iterator = generator.apply(this, args);

    // Wait generates callbacks which collect arguments and pass them back to
    // the generator
    function wait() {
      const op = {waiting: true};
      ops.push(op);

      return function next(err, value) {
        op.waiting = false;
        op.error = err;
        op.result = arguments.length > 2 ? [].slice.call(arguments, 1) : value;

        return run();
      };
    }

    function await(promise) {
      const op = {waiting: true, promise: promise};
      ops.push(op);

      function resolve(value) {
        op.waiting = false;
        op.error = null;
        op.result = value;

        return run();
      }

      function reject(error) {
        op.waiting = false;
        op.error = error;

        return run();
      }

      promise.then(resolve, reject);
    }

    // Run continues the iteration of the generator
    function run() {
      // In the case of immediate callback use the generator may be running in
      // sync mode. This flag prevents double iteration.
      if (isRunning) {
        return;
      }

      isRunning = true;

      while (ops.length > 0 && !ops[0].waiting) {
        let op = ops.shift();
        let current;
        let value;

        try {
          current = op.error ? iterator.throw(op.error) : iterator.next(op.result);
          value = current.value;

          if (isPromise(value)) {
            await(value);
          }

        } catch (err) {
          last(err);
          return;
        }

        if (current.done) {
          last(null, current.value);
          return;
        }
      }

      if (ops.length === 0) {
        last(new Error('Not awaiting any operations'));
        return;
      }

      isRunning = false;
    }

    if (typeof iterator.next !== 'function') {
      last(null, iterator);
      return;
    }

    // First call is a noop
    ops.push({waiting: false});

    run();
  };
};

module.exports = Resync;
