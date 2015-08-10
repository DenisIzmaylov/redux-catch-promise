export default function PromisedThunk(callback) {
  return (store) => (next) => (action) => {
    const { dispatch, getState } = store;
    if (typeof action === 'function') {
      const result = action(dispatch, getState);
      if (typeof result === 'object' && typeof result.then === 'function') {
        callback(result, action, store);
      }
      return result;
    }
    return next(action);
  };
}
