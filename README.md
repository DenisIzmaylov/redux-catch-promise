redux-catch-promise
===================

Redux [middleware](https://github.com/gaearon/redux/blob/master/docs/middleware.md) to catch promises from functions processed by [redux-thunk](https://github.com/gaearon/redux-thunk/).

Extremely useful for server-side rendering React components with asynchronous loaded state. See [example below](#react-server-side-rendering).

## Usage

`redux-thunk` middleware allows you to write action creators that return a thunk instead of an action. The thunk can be used to delay the dispatch of an action, or to dispatch only if a certain condition is met. But in this way you could not get control if your action returns Promises and async functions. `redux-catch-promise` solves this.

To enable `redux-catch-promise` use `applyMiddleware()`:

```js
import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
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

## React Server-Side Rendering

It's a short demo with `koa` to implement server-side rendering of your component with async-loaded state:

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

`application.js`
```javascript
import React, { Component, PropTypes } from 'react';
import { combineReducers, createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import catchPromise from 'redux-catch-promise';
import ProjectsList from './projects-list';

export default class Application extends Component {
  static propTypes = {
    state: PropTypes.object,
    serverSideRendering: PropTypes.object
  };

  constructor(props, context) {
    super(props, context);
    const { serverSideRendering } = props;
    const createStoreWithMiddleware = applyMiddleware(
      thunk,
      (typeof serverSideRendering === 'object') ?
        catchPromise((promisedAction, action, store) => {
          serverSideRendering.preparePromises.push(promisedAction);
          serverSideRendering.sharedState = store.getState();
        }) : undefined
    )(createStore);
    const allReducers = combineReducers(reducers);
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
      <ProjectsList prepare={this.prepare} />
    );
  }
}
```

`projects-list.js`
```javascript
import React, { Component, PropTypes } from 'react';
import { bindActionCreators, connect } from 'react-redux';
import * as projectsListActions from './projects-list-actions';

function selector(state) {
  return {
    projectsList: state.projectsList
  };
}

class ProjectsList extends Component {
  constructor(props, context) {
    super(props, context);
    this.prepareActions = [
      projectsListActions.fetch()
    ];
    if (typeof props.prepare === 'function') {
      props.prepare(this.prepareActions);
    }
  }
  
  render() {
    const { projectsList } = this.props;
    return (
      <ul>
        {Array.isArray(projectsList.items) ?
          projectsList.items.map((it) => <li>{it.name}</li>) :
          <li>No projects</li>}
      </ul>
    );
  }
  
  componentDidMount() {
    // React will not call this method by server-side rendering
    if (this.prepareDataActions) {
      const props = this.props;
      this.prepareDataActions.forEach((action) => props.dispatch(action));
    }
  }
}
```

`projects-list-actions.js`
```javascript
import {
  PROJECTS_LIST_UPDATE
} from './action-types';

export default function fetch (className, force) {
  return async (dispatch, getState) => {
    if (__BROWSER__) {
      try {
        const data = await fetch('/api/projects', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        });
        const body = await data.json();
      } catch(err) {
        console.error(err);
      }
      dispatch({
        type: PROJECTS_LIST_UPDATE,
        state: body
      });
    }
    if (__SERVER__) {
      const pmongo = require('pmongo');
      const projectsCollection = pmongo.collection('projects');
      try {
        const cursor = await projectsCollection.find({});
        const result = cursor.toArray();
        dispatch({
          type: PROJECTS_LIST_UPDATE,
          state: result
        });
      } catch (err) {
        console.error(err);
      }
    }
  }
}
```

## License

MIT
