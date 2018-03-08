const prepare = require('./dist/lib/prepare').default;

module.exports = appInitializer => prepare(appInitializer, true);
