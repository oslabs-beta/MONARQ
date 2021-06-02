const routerCreation = require('./routerCreation');

const queryGen = require('./queryMap');

const { queryMap } = queryGen;

module.exports = {
  routerCreation,
  queryMap,
};
