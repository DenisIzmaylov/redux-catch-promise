redux-catch-promise
===================

Async thunk [middleware](http://rackt.github.io/redux/docs/advanced/Middleware.html) for Redux. Write your async actions in a few lines. 

Extremely useful for server-side rendering React components with asynchronous loaded state. See [example below](#server-side-rendering-with-async-state).

## What’s a thunk?!

A thunk is a function that wraps an expression to delay its evaluation.

```javascript
// calculation of 1 + 2 is immediate
// x === 3
let x = 1 + 2;

// calculation of 1 + 2 is delayed
// foo can be called later to perform the calculation
// foo is a thunk!
let foo = () => 1 + 2;
```

## Motivation

`redux-catch-promise` middleware allows you to write action creators that return sync or async functions instead of an action. The thunk can be used to delay the dispatch of an action, or to dispatch only if a certain condition is met. The inner function receives the store methods dispatch and getState() as parameters.

An action creator that returns an async functions to perform asynchronous dispatch:
```javascript
const SHOW_USER_LOCATION = 'SHOW_USER_LOCATION';

function showUserLocation(location) {
  return {
    type: SHOW_USER_LOCATION,
    location
  };
}

function requestUserLocation(userName) {
  return dispatch => async function () {
    const finalURL = 'https://api.github.com/users/' + userName;
    const response = await fetch(URL, {
      method: 'POST'
    });
    const data = await response.json();
    showUserLocation(data['location']);
  };
}
```

## Installation


### Upgrade `redux-thunk` to `redux-catch-promise`

To enable async actions in a way above you have to replace `redux-thunk` to `redux-catch-promise`. Just do it in 3 steps:

* ```npm install redux-catch-promise --save```
* Replace import declaration:
```javascript
import thunk from 'redux-thunk';
```
to
```javascript
import CatchPromise from 'redux-catch-promise';
```
* Replace middleware assignment, i.e:
```javascript
const createStoreWithMiddleware = applyMiddleware(thunk)(createStore);
```
to 
```javascript
const actionPromises = [];
const catchPromise = CatchPromise();
const createStoreWithMiddleware = applyMiddleware(catchPromise)(createStore);
```

### Clean installation

* ```npm install redux-catch-promise --save```
* Add import declaration:
```javascript
import CatchPromise from 'redux-catch-promise';
```
* Add middleware assignment, i.e:
```javascript
const actionPromises = [];
const catchPromise = CatchPromise();
const createStoreWithMiddleware = applyMiddleware(catchPromise)(createStore);
```

## Server-side Rendering with async state

```javascript
import { createStore, applyMiddleware, combineReducers } from 'redux';
import catchPromise from 'redux-catch-promise';
import * as reducers from './reducers/index';

const reducer = combineReducers(reducers);

// create a store that has redux-thunk middleware enabled
const actionPromises = [];
const createStoreWithMiddleware = applyMiddleware(
  thunk,
  catchPromise((promisedAction, action, store) => {
    // it calls only when a Promise found
    actionPromises.push(promisedAction);
  }
)(createStore);

const store = createStoreWithMiddleware(reducer);
```

## Server-side rendering with async state

It's a short demo how to implement with this middleware server-side rendering of your React components with async-loading state:

`server.js`
```javascript
const React from 'react';
const Application from './application';
const koa = require('koa');
const app = koa();

app.use(function *(next) {
  const preparePromises = [];
  const serverSideRendering = {
    preparePromises,
    sharedState: {}
  };
  const application = (
    <Application serverSideRendering={serverSideRendering} />
  );
  const prefetchedBody = React.renderToString(application);
  if (preparePromises.length > 0) {
    for (let index = 0, length = preparePromises.length; index < length; index++) {
      yield preparePromises[index];
    }
  }
  // re-render with fetched data if prepare promises are found
  let body;
  if (serverSideRendering.preparePromises.length > 0) {
    body = React.renderToString(
      application
    );
  } else {
    body = prefetchedBody;
  }
  const code = 'window._sharedData = ' + JSON.stringify(sharedData) + ';';
  yield this.render('react-page', {
    'body': body,
    'code': code
  })
});
```

`client.js`
```javascript
import 'isomorphic-fetch';
import React from 'react';
import Application from './application';

const state = (window._sharedData && window._sharedData['state']) || {};
const rootElement = document.getElementById('root');

React.render(<Application state={state} />, rootElement);
```

`application.js`
```javascript
import React, { Component, PropTypes } from 'react';
import { combineReducers, createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import CatchPromise from 'redux-catch-promise';
import ReposList from './repos-list';
import reposListReducer from './repos-list/reducer';

export default class Application extends Component {
  static propTypes = {
    state: PropTypes.object,
    serverSideRendering: PropTypes.object
  };

  constructor(props, context) {
    super(props, context);
    const { serverSideRendering } = props;
    const catchPromise = CatchPromise(
      (typeof serverSideRendering === 'object') &&
        (promisedAction, action, store) => {
          serverSideRendering.preparePromises.push(promisedAction);
          serverSideRendering.sharedState = store.getState();
        });
    const createStoreWithMiddleware = applyMiddleware(catchPromise)(createStore);
    const allReducers = combineReducers({
      repostList: repostListReducer
    });
    const store = createStoreWithMiddleware(allReducers, props.state || {});
    if (typeof serverSideRendering === 'object') {
      // callback to dispatch passed actions
      this.prepare = (actions) => actions.forEach((action) => store.dispatch(action));
    }
  }
  
  render() {
    return (
      <Provider store={this.state.store}>
        {this.renderChild.bind(this)}
      </Provider>
    );
  }
  
  renderChild() {
    return (
      <ReposList prepare={this.prepare} />
    );
  }
}
```

`repos-list/index.js`
```javascript
import React, { Component, PropTypes } from 'react';
import { bindActionCreators, connect } from 'react-redux';
import * as projectsListActions from './actions';

function selector(state) {
  return {
    reposList: state.reposList
  };
}

class ReposList extends Component {
  constructor(props, context) {
    super(props, context);
    this.prepareActions = [
      reposListActions.fetch()
    ];
    if (typeof props.prepare === 'function') {
      props.prepare(this.prepareActions);
    }
  }
  
  render() {
    const { reposList } = this.props;
    return (
      <ul>
        {Array.isArray(reposList.items) ?
          reposList.items.map((it) => <li>{it['name']}</li>) :
          <li>Empty</li>}
      </ul>
    );
  }
  
  componentDidMount() {
    if (this.prepareDataActions) {
      const props = this.props;
      this.prepareDataActions.forEach((action) => props.dispatch(action));
    }
  }
}
```

`repos-list/action-types.js`
```javascript
export default {
  UPDATE: 'REPOS_LIST_UPDATE'
};
```

`repos-list/actions.js`
```javascript
import {
  UPDATE
} from './action-types';

export default function fetch (className, force) {
  return async (dispatch, getState) => {
    try {
      const data = await fetch('http://api.github.com/users/DenisIzmaylov/repos');
      const items = await data.json();
    } catch(err) {
      console.error(err);
    }
    dispatch({
      type: UPDATE,
      state: { items }
    });
  }
}
```

`repos-list/reducer.js`
```javascript
import {
  UPDATE
} from './action-types';

const initialState = {
  items: {}
};

export default function (state = initialState, action = {}) {
  switch (action.type) {
    case UPDATE:
      return [action.state, ...state];
    default:
      return state;
  }
}
```

## Thanks 

* [redux-thunk](https://github.com/gaearon/redux-thunk/) for inspiration

## License

MIT
