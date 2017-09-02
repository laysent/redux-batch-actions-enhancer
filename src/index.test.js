import { createStore, compose, applyMiddleware } from 'redux';
import { createAction, batch } from '.';

describe('Redux.Batch', () => {
  let store;
  const action = { type: 'type' };
  const reducer = jest.fn(num => num + 1);
  beforeEach(() => {
    store = createStore(reducer, 0, batch().enhancer);
    reducer.mockClear();
  });
  it('should provide enhancer and middleware', () => {
    const { enhancer, middleware } = batch();

    expect(typeof enhancer).toBe('function');
    expect(typeof middleware).toBe('function');
  });
  it('should create store correctly', () => {
    expect(typeof store.dispatch).toBe('function');
    expect(typeof store.getState).toBe('function');
    expect(typeof store.subscribe).toBe('function');
  });
  it('should be able to subscribe', () => {
    const fA = jest.fn();
    const fB = jest.fn();
    store.subscribe(fA);
    store.subscribe(fB);
    store.dispatch(action);

    expect(fA).toHaveBeenCalledTimes(1);
    expect(fB).toHaveBeenCalledTimes(1);
  });
  it('should be able to unsubscribe specific subscription', () => {
    const unsubscribedF = jest.fn();
    const subscribedF = jest.fn();
    const unsubscribe = store.subscribe(unsubscribedF);
    store.subscribe(subscribedF);
    unsubscribe();
    store.dispatch(action);

    expect(unsubscribedF).not.toHaveBeenCalled();
    expect(subscribedF).toHaveBeenCalledTimes(1);
  });
  it('should be fine to call unsubscribe multiple times', () => {
    const fn = jest.fn();
    const unsubscribe = store.subscribe(fn);
    unsubscribe();

    expect(unsubscribe).not.toThrow();
  });
  it('should notify subscription about current dispatch reglardless if get unsubscribed in the process', () => {
    const allUnsubscriptions = [];
    const unsubscribeAll = () => allUnsubscriptions.forEach(unsub => unsub());

    const subscriptionA = jest.fn();
    const subscriptionB = jest.fn();
    const subscriptionC = jest.fn();
    const unsubscriptionA = store.subscribe(subscriptionA);
    const unsubscriptionB = store.subscribe(() => {
      subscriptionB();
      unsubscribeAll();
    });
    const unsubscriptionC = store.subscribe(subscriptionC);
    allUnsubscriptions.push(unsubscriptionA);
    allUnsubscriptions.push(unsubscriptionB);
    allUnsubscriptions.push(unsubscriptionC);

    const batchAction = createAction(action, action);
    store.dispatch(batchAction);

    expect(subscriptionA).toHaveBeenCalledTimes(1);
    expect(subscriptionB).toHaveBeenCalledTimes(1);
    expect(subscriptionC).toHaveBeenCalledTimes(1);
  });
  it('should notify subscription about current dispatch only if it is currently active', () => {
    const subscriptionA = jest.fn();
    const subscriptionB = jest.fn();
    const subscriptionC = jest.fn();
    let subscriptionCAdded = false;
    const addSubscriptionC = () => {
      if (subscriptionCAdded) return;
      subscriptionCAdded = true;
      store.subscribe(subscriptionC);
    };
    store.subscribe(subscriptionA);
    store.subscribe(() => {
      subscriptionB();
      addSubscriptionC();
    });
    const batchAction = createAction(action, action);

    store.dispatch(batchAction);
    expect(subscriptionA).toHaveBeenCalledTimes(1);
    expect(subscriptionB).toHaveBeenCalledTimes(1);
    expect(subscriptionC).toHaveBeenCalledTimes(0);

    store.dispatch(batchAction);
    expect(subscriptionA).toHaveBeenCalledTimes(2);
    expect(subscriptionB).toHaveBeenCalledTimes(2);
    expect(subscriptionC).toHaveBeenCalledTimes(1);
  });
  it('should use last snapshot of subscribers during nested dispatch', () => {
    const subscriptionA = jest.fn();
    const subscriptionB = jest.fn();
    const subscriptionC = jest.fn();
    const subscriptionD = jest.fn();
    const batchAction = createAction(action, action);

    let unsubscriptionD;
    const unsubscriptionA = store.subscribe(() => {
      subscriptionA();
      expect(subscriptionA).toHaveBeenCalledTimes(1);
      expect(subscriptionB).toHaveBeenCalledTimes(0);
      expect(subscriptionC).toHaveBeenCalledTimes(0);

      unsubscriptionA();
      unsubscriptionD = store.subscribe(subscriptionD);
      store.dispatch(batchAction);

      expect(subscriptionA).toHaveBeenCalledTimes(1);
      expect(subscriptionB).toHaveBeenCalledTimes(1);
      expect(subscriptionC).toHaveBeenCalledTimes(1);
      expect(subscriptionD).toHaveBeenCalledTimes(1);
    });
    store.subscribe(subscriptionB);
    store.subscribe(subscriptionC);

    store.dispatch(batchAction);
    expect(subscriptionA).toHaveBeenCalledTimes(1);
    expect(subscriptionB).toHaveBeenCalledTimes(2);
    expect(subscriptionC).toHaveBeenCalledTimes(2);
    expect(subscriptionD).toHaveBeenCalledTimes(1);

    unsubscriptionD();
    store.dispatch(batchAction);
    expect(subscriptionA).toHaveBeenCalledTimes(1);
    expect(subscriptionB).toHaveBeenCalledTimes(3);
    expect(subscriptionC).toHaveBeenCalledTimes(3);
    expect(subscriptionD).toHaveBeenCalledTimes(1);
  });
  it('should process multiple action but only once for subscription', () => {
    const firstAction = { type: 'first' };
    const secondAction = { type: 'second' };
    const subscription = jest.fn();
    const batchAction = createAction(firstAction, secondAction);
    store.subscribe(subscription);
    store.dispatch(batchAction);

    expect(reducer).toHaveBeenCalledTimes(2);
    expect(reducer).toHaveBeenCalledWith(1, firstAction);
    expect(reducer).toHaveBeenCalledWith(2, secondAction);
    expect(subscription).toHaveBeenCalledTimes(1);
  });
  it('should trigger subscription at the end of processing of all actions', () => {
    const firstAction = { type: 'first' };
    const secondAction = { type: 'second' };
    const subscription = jest.fn(() => {
      expect(reducer).toHaveBeenCalledTimes(2);
    });
    const batchAction = createAction(firstAction, secondAction);
    store.subscribe(subscription);
    store.dispatch(batchAction);

    expect(subscription).toHaveBeenCalledTimes(1);
  });
  it('should not trigger subscription if no action provided', () => {
    const subscription = jest.fn();
    const batchAction = createAction();
    store.subscribe(subscription);
    store.dispatch(batchAction);

    expect(subscription).not.toHaveBeenCalled();
  });
  it('should not affect other actions', () => {
    const normalAction = { type: 'type', payload: [] };
    const subscription = jest.fn();
    store.subscribe(subscription);
    store.dispatch(normalAction);

    expect(subscription).toHaveBeenCalledTimes(1);
    expect(reducer).toHaveBeenCalledWith(1, normalAction);
  });
  it('should throw error if elsewhere throws it', () => {
    const nonAction = 'non-action';

    expect(() => store.dispatch(nonAction)).toThrow();
  });
  it('should not affect next action if previous one triggers error', () => {
    const firstAction = { type: 'first' };
    const secondAction = { type: 'second' };
    const batchAction = createAction(firstAction, secondAction);
    const nonAction = createAction('non-action', 'non-action');
    const subscription = jest.fn(() => {
      expect(reducer).toHaveBeenCalledTimes(2);
      expect(reducer).toHaveBeenCalledWith(1, firstAction);
      expect(reducer).toHaveBeenCalledWith(2, secondAction);
    });
    store.subscribe(subscription);
    try {
      store.dispatch(nonAction);
    } catch (e) {
      // do nothing
    }
    store.dispatch(batchAction);

    expect(subscription).toHaveBeenCalledTimes(1);
  });
  it('should throw when subscribing non-function instance', () => {
    [null, undefined, 0, 1, '', [], {}].forEach((nonFunction) => {
      expect(() => store.subscribe(nonFunction)).toThrow();
    });
  });
  it('should work with muliple batch middleware', () => {
    const { enhancer, middleware } = batch();
    const duplicateMiddleware = () => next => singleAction =>
      next(createAction(singleAction, singleAction));
    store = createStore(
      reducer,
      0,
      compose(enhancer, applyMiddleware(duplicateMiddleware, middleware)),
    );
    const firstAction = { type: 'first' };
    const secondAction = { type: 'second' };
    const subscription = jest.fn(() => {
      expect(reducer).toHaveBeenCalledWith(1, firstAction);
      expect(reducer).toHaveBeenCalledWith(2, firstAction);
      expect(reducer).toHaveBeenCalledWith(3, secondAction);
      expect(reducer).toHaveBeenCalledWith(4, secondAction);
    });
    const batchAction = createAction(firstAction, secondAction);
    store.subscribe(subscription);
    store.dispatch(batchAction);

    expect(subscription).toHaveBeenCalledTimes(1);
  });
});
