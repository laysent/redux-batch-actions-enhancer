redux-batch-actions-enhancer
============================

Store enhancer for [redux](https://github.com/reactjs/redux), which allows single trigger of
subscriptions after a bunch of actions.

## Installation

```bash
npm install --save redux-batch-actions-enhancer
```

## Usage

```javascript
import { createStore } from 'redux';
import { batch, createAction } from 'redux-batch-actions-enhancer';

const store = createStore(reducer, initialState, batch().enhancer);

const actionA = { type: 'A' };
const actionB = { type: 'B' };
store.dispatch(createAction(actionA, actionB));
```
