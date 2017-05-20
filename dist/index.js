'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.files = exports.loki = undefined;
exports.init = init;
exports.save = save;
exports.getStore = getStore;

var _lokijs = require('lokijs');

var _lokijs2 = _interopRequireDefault(_lokijs);

var _multimatch = require('multimatch');

var _multimatch2 = _interopRequireDefault(_multimatch);

var _vow = require('vow');

var _vow2 = _interopRequireDefault(_vow);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const dbg = (0, _debug2.default)('metalsmith-debug');

// promise to keep track of load state
const loaded = _vow2.default.defer();
loaded.promise().then(() => dbg('cache loaded'));

// instantiate & load
const loki = exports.loki = new _lokijs2.default('cache.json');
loki.loadDatabase({}, () => loaded.resolve(loki));

function init(cb) {
  if (cb) return loaded.promise().then(cb);
  return loaded.promise();
}

function save(cb) {
  const defer = _vow2.default.defer();
  defer.promise().then(() => dbg('cache saved')).then(cb);
  loki.saveDatabase(() => defer.resolve());
  return defer.promise();
}

const files = exports.files = loki.getCollection('files') || loki.addCollection('files', { unique: 'path' });
files.store = (path, file) => {
  const doc = { path, file };
  const existing = files.findOne({ path });
  if (existing) return files.update(existing, doc);
  return files.insert(doc);
};
files.retrieve = path => {
  const result = files.findOne({ path });
  if (result) return result.file;
};
files.all = () => {
  const results = {};
  files.data.forEach(doc => {
    results[doc.path] = doc.file;
  });
  return results;
};
files.match = mask => {
  files.where(doc => {
    return (0, _multimatch2.default)(mask, [doc.path]);
  });
};

function getStore(name) {
  const store = loki.getCollection(name) || loki.addCollection(name, { unique: 'key' });
  store.store = (key, value) => {
    const existing = store.findOne({ key });
    if (existing) {
      existing.value = value;
      store.update(existing);
    } else {
      store.insert({ key, value });
    }
  };
  store.retrieve = key => {
    const result = store.findOne({ key });
    if (result) return result.value;
  };
  return store;
}