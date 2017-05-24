'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.save = exports.init = exports.ValueCache = exports.FileCache = exports.loki = undefined;

var _lokijs = require('lokijs');

var _lokijs2 = _interopRequireDefault(_lokijs);

var _minimatch = require('minimatch');

var _minimatch2 = _interopRequireDefault(_minimatch);

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

class FileCache {
  constructor(name) {
    this.collection = loki.getCollection(name) || loki.addCollection(name, { unique: 'path' });
  }
  store(path, file) {
    const doc = { path, file };
    const existing = this.collection.findOne({ path });
    if (existing) return this.collection.update(existing, doc);
    return this.collection.insert(doc);
  }
  retrieve(path) {
    const result = this.collection.findOne({ path });
    if (result) return result.file;
  }
  all() {
    const results = {};
    this.collection.data.forEach(doc => {
      results[doc.path] = doc.file;
    });
    return results;
  }
  match(mask) {
    const results = {};
    this.collection.data.forEach(doc => {
      if (!(0, _minimatch2.default)(doc.path, mask)) return;
      results[doc.path] = doc.file;
    });
    return results;
  }
  remove(path) {
    const result = this.collection.findOne({ path });
    if (result) result.remove();
  }
}

class ValueCache {
  constructor(name) {
    this.collection = loki.getCollection(name) || loki.addCollection(name, { unique: 'key' });
  }
  store(key, value) {
    const existing = this.collection.findOne({ key });
    if (existing) {
      existing.value = value;
      return this.collection.update(existing);
    }
    return this.collection.insert({ key, value });
  }
  retrieve(key) {
    const result = this.collection.findOne({ key });
    if (result) return result.value;
  }
}

exports.FileCache = FileCache;
exports.ValueCache = ValueCache;
exports.init = init;
exports.save = save;