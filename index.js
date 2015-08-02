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

function isWaiting(op) {
  return op.waiting;
}

function isReady(ops, all) {
  if (!all) {
    return ops.length > 0 && !isWaiting(ops[0]);
  }

  return ops.some(isError) || !ops.some(isWaiting);
}

function isError(op) {
  return !!op.error;
}

function getError(ops, all) {
  for (let i = 0, il = ops.length; i < il; i++) {
    if (ops[i].error) {
      return ops[i].error;
    }

    if (!all) {
      break;
    }
  }

  return null;
}

function getResult(op) {
  return op.result;
}

function getResults(ops, all) {
  if (!all) {
    return getResult(ops[0]);
  }

  return ops.map(getResult);
}

var Resync = function Resync(generator) {
  return function start() {
    var ops = [];
    var isRunning = false;
    let all = false;

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

      while (isReady(ops, all)) {
        let current;
        let value;

        try {
          let error = getError(ops, all);
          let result = getResults(ops, all);

          current = error ? iterator.throw(error) : iterator.next(result);
          ops.splice(0, all ? ops.length : 1);
          value = current.value;

          if (isPromise(value)) {
            await(value);
          }

          all = value === Array;
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
