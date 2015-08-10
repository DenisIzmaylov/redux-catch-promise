'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = catchPromise;

function catchPromise(callback) {
  return function (store) {
    return function (next) {
      return function (action) {
        var dispatch = store.dispatch;
        var getState = store.getState;

        if (typeof action === 'object' && typeof action.then === 'function') {
          if (typeof callback === 'function') {
            callback(result, action, store);
          }
        }
        return next(action);
      };
    };
  };
}

module.exports = exports['default'];