export default function catchPromise(callback) {
  return (store) => (next) => (action) => {
    const { dispatch, getState } = store;
    if (typeof action === 'object' && typeof action.then === 'function') {
      if (typeof callback === 'function') {
        callback(result, action, store);
      }
    }
    return next(action);
  };
}
