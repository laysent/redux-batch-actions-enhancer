export const type = '@@type/batch';

export const createAction = (...actions) => ({
  type,
  payload: actions,
});

const isBatchAction = action => action && action.type === type;

export function batch() {
  let pendingAction = 0;
  let nextListeners;
  let currentListeners;

  const middleware = () => next => (action) => {
    if (!isBatchAction(action)) return next(action);
    const actions = [].concat(action.payload);
    pendingAction += actions.length;
    return actions
      .reduce((prev, currAction) => {
        pendingAction -= 1;
        try {
          return next(currAction);
        } catch (e) {
          pendingAction = 0;
          throw e;
        }
      }, null);
  };

  const enhancer = (createStore) => {
    nextListeners = [];
    currentListeners = nextListeners;

    function ensureCanMutateNextListeners() {
      if (nextListeners === currentListeners) nextListeners = currentListeners.slice();
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new Error('Invalid listeners, expected a function.');
      }
      let isSubscribed = true;

      ensureCanMutateNextListeners();
      nextListeners.push(listener);

      return function unsubscribe() {
        if (!isSubscribed) return;

        ensureCanMutateNextListeners();
        nextListeners.splice(nextListeners.indexOf(listener), 1);
        isSubscribed = false;
      };
    }

    function notify() {
      if (pendingAction > 0) return;
      currentListeners = nextListeners;
      const listeners = currentListeners;
      for (let i = 0; i < listeners.length; i += 1) {
        const listener = listeners[i];
        listener();
      }
    }

    return (reducer, preloadedState, enhancers) => {
      const store = createStore(reducer, preloadedState, enhancers);
      const dispatch = middleware()(store.dispatch);

      store.subscribe(notify);

      return {
        ...store,
        dispatch,
        subscribe,
      };
    };
  };

  return {
    enhancer,
    middleware,
  };
}
