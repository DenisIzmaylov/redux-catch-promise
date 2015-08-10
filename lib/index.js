'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = PromisedThunk;

function PromisedThunk(callback) {
  return function (store) {
    return function (next) {
      return function (action) {
        var dispatch = store.dispatch;
        var getState = store.getState;

        if (typeof action === 'function') {
          var result = action(dispatch, getState);
          if (typeof result === 'object' && typeof result.then === 'function') {
            callback(result, action, store);
          }
          return result;
        }
        return next(action);
      };
    };
  };
}

module.exports = exports['default'];