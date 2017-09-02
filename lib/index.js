(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.ReduxBatch = {})));
}(this, (function (exports) { 'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var type = '@@type/batch';

var createAction = function createAction() {
  for (var _len = arguments.length, actions = Array(_len), _key = 0; _key < _len; _key++) {
    actions[_key] = arguments[_key];
  }

  return {
    type: type,
    payload: actions
  };
};

var isBatchAction = function isBatchAction(action) {
  return action && action.type === type;
};

function batch() {
  var pendingAction = 0;
  var nextListeners = void 0;
  var currentListeners = void 0;

  var middleware = function middleware() {
    return function (next) {
      return function (action) {
        if (!isBatchAction(action)) return next(action);
        var actions = [].concat(action.payload);
        pendingAction += actions.length;
        return actions.reduce(function (prev, currAction) {
          pendingAction -= 1;
          try {
            return next(currAction);
          } catch (e) {
            pendingAction = 0;
            throw e;
          }
        }, null);
      };
    };
  };

  var enhancer = function enhancer(createStore) {
    nextListeners = [];
    currentListeners = nextListeners;

    function ensureCanMutateNextListeners() {
      if (nextListeners === currentListeners) nextListeners = currentListeners.slice();
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new Error('Invalid listeners, expected a function.');
      }
      var isSubscribed = true;

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
      var listeners = currentListeners;
      for (var i = 0; i < listeners.length; i += 1) {
        var listener = listeners[i];
        listener();
      }
    }

    return function (reducer, preloadedState, enhancers) {
      var store = createStore(reducer, preloadedState, enhancers);
      var dispatch = middleware()(store.dispatch);

      store.subscribe(notify);

      return _extends({}, store, {
        dispatch: dispatch,
        subscribe: subscribe
      });
    };
  };

  return {
    enhancer: enhancer,
    middleware: middleware
  };
}

exports.type = type;
exports.createAction = createAction;
exports.batch = batch;

Object.defineProperty(exports, '__esModule', { value: true });

})));
