redux-batch-actions-enhancer
============================

Store enhancer for [redux](https://github.com/reactjs/redux), which allows single trigger of
subscriptions after a bunch of actions.

## Installation

```bash
npm install --save redux-batch-actions-enhancer
```

## Usage

To add batch feature, simply provide enhancer as third parameter to redux, then you can use the
built-in helper function `createAction` to generate a batch action containing all the actions
given in parameters:

```javascript
import { createStore } from 'redux';
import { batch, createAction } from 'redux-batch-actions-enhancer';

const store = createStore(reducer, initialState, batch().enhancer);

const actionA = { type: 'A' };
const actionB = { type: 'B' };
store.dispatch(createAction(actionA, actionB));
```

Notice that `batch` is a function returns `enhancer` which can be used in creating store. This might
be helpful if there are more than one redux instance inside the app.

If you have any middleware, you can use the redux built-in function `compose` to combine these
enhancers together:

```javascript
import { createStore, applyMiddleare, compose } from 'redux';
import { batch, createAction } from 'redux-batch-actions-enhancer';
import createLogger from 'redux-logger';

const logger = createLogger();

const store = createStore(
    reducer,
    initialState,
    compose(batch().enhancer, applyMiddleware(logger)),
);

store.dispatch(createAction(actionA, actionB));
```

One thing to mention is that after `enhancer`, the batch actions will be decomposed and sent to
middleware one by one. As a result, you should see redux-logger output `actionA` and `actionB`
separately.

If your middleware also generates batch actions, you will need to add another middleware after it
to decompose it:

```javascript
import { createStore, applyMiddleware, compose } from 'redux';
import { batch, createAction } from 'redux-batch-actions-enhancer';
import promise from 'redux-promise';
import createLogger from 'redux-logger';

const logger = createLogger();
const { enhancer, middleware } = batch();

const store = createStore(
    reducer,
    initialState,
    compose(enhancer, applyMiddleware(promise, middleware, logger)),
);

store.dispatch(new Promise(resolve => resolve(createAction(actionA, actionB))));
```

In the example above, redux-promise might generate new batch action. To ensure that it will be well
handled by following middleware and reducers, the built-in `middleware` needs to be added after. This
way, redux-logger can output `actionA` and `actionB` separately.

Notice that both `enhancer` and `middleware` should be from same `batch()` return, otherwise they might
not share the same local state and cause unintentional issues.

## Reason

When using redux, I personally prefer to create many "atom" actions, each represents a specific
modification of state. However, in real world, a user's action might cause a combination of many
"atom" actions. If all those "atom" actions are sent one by one, it will cause reducers to change
state many times and cause subscribers to be triggered multiple times. Since all these "atom" actions
come from one single user action, it might be more nature if subscriptions can be triggered only
once.

There are planty of implementations in the field already. However, after some research, I found none
of them fulfills all my requirements. Thus, instead, this repo is created.

The main difference between this repo and many others are:

1. this one not only combines actions together, but also triggers subscription only once, just as
there is only one action being dispatched.

    This will be very helpful for all subscriptions, especially those who have high computational
    costs.

2. this one offers enhancer instead of reconstructing reducers directly

    A good reason to start with enhancer not reducer is that it will be easier for middlewares
    to handle. If batch actions are only handled in reducer, middlewares can only see a bunch
    of actions all in one. That might add extra works for middleware as it might need to look one
    by one inside, to know if any of the actions in it should be dealt with.

3. this one offers optional middleware in case any existing middleware generates batch actions
as well.

    It is very common for middleware such as redux-promise or redux-thunk to generate new actions.
    If batch actions are generated inside middleware, extra works need to be done to ensure it
    still works. Also, this repo makes it opt-in, so that one can choose when to use it.

4. this one only garuantees that batch action will trigger subscriptions one time, nothing more
nothing less.

    Some other repo makes options to use different functions to debounce. This might provide more
    powerful feature, but also makes it harder to use. Simplicity is prefered here.
