const prepare = require('./dist/lib/prepare').default;

module.exports = async appInitializer => prepare(appInitializer, true);
