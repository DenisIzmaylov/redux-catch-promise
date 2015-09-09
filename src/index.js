export default function CatchPromise(callback) {
  return (store) => (next) => (action) => {
    const { dispatch, getState } = store;
    
    if (typeof action === 'function') {
      const result = action(dispatch, getState);

      if (typeof callback === 'function') {
        const isPromise =
          (typeof result === 'object' &&
            typeof result.then === 'function');
        
        if (isPromise) {
          callback(result, action, store);
        }
      }
      return result;
    }
    
    return next(action);
  };
}
