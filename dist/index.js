'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.save = exports.init = exports.ValueCache = exports.FileCache = undefined;

var _lokijs = require('lokijs');

var _lokijs2 = _interopRequireDefault(_lokijs);

var _minimatch = require('minimatch');

var _minimatch2 = _interopRequireDefault(_minimatch);

var _vow = require('vow');

var _vow2 = _interopRequireDefault(_vow);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const dbg = (0, _debug2.default)('metalsmith-cache');

// promise to keep track of load state
/* global loki */
const loaded = _vow2.default.defer();
loaded.promise().then(() => dbg('cache loaded'));

/**
 * ## instantiate & load
 * yes a global is the best option for the loki db connector.
 *
 * if you instantiate loki more than once, and loadDatabase on each of them,
 * then each will start with the same data but when each instance saves itself
 * it will only save it's own changes, overwriting changes from other
 * instances.
 *
 * a singleton isn't a singleton if different versions of a module are used
 *
 * therefore, a global variable is the best option IMO
 */
if (!global.loki) {
  global.loki = new _lokijs2.default('cache.json');
  loki.loadDatabase({}, () => loaded.resolve(loki));
}

/**
 * ## init
 * Promise resolved when db initiated.
 *
 * Initialisation begins when the module is loaded. This fn merely returns a
 * promise or calls a callback once initialisation is complete. That means it's
 * ok to call `init` multiple times in your consumer code.
 *
 * @param {Function} cb callback
 * @returns {Promise}
 */
function init(cb) {
  if (cb) return loaded.promise().then(cb);
  return loaded.promise();
}

/**
 * ## save
 * Writes db to disk
 *
 * @param {Function} cb callback
 * @returns {Promise}
 */
function save(cb) {
  const defer = _vow2.default.defer();
  defer.promise().then(() => dbg('cache saved')).then(cb);
  loki.saveDatabase(() => defer.resolve());
  return defer.promise();
}

/**
 * ## FileCache
 * An interface to the file cache
 */
class FileCache {
  /**
   * ### constructor
   * @param {String} name a namespace
   */
  constructor(name) {
    this.collection = loki.getCollection(name) || loki.addCollection(name, { unique: 'path' });
  }
  /**
   * ### store
   * store files
   * call with `store(files)` or `store(path, file)`
   *
   * @param {Object|String} files as it appears in ms files structure
   * @param {Object} file as it appears in ms files structure
   */
  store(files, file) {
    // alt syntax
    if (typeof files === 'string' && file) files = { [files]: file };
    Object.keys(files).forEach(path => {
      const doc = { path, file: files[path] };
      const existing = this.collection.findOne({ path });
      if (existing) return this.collection.update(existing, doc);
      return this.collection.insert(doc);
    });
  }
  /**
   * ### retrieve
   * retrieve a file
   * @param {String} path as it appears in ms files structure
   * @returns {Object} the file object
   */
  retrieve(path) {
    const result = this.collection.findOne({ path });
    if (!result) return;
    if (result.file.contents) {
      result.file.contents = Buffer.from(result.file.contents);
    }
    Object.keys(result.file).forEach(key => {
      if (typeof result.file[key] === 'string' && /^[0-9|-]{10}T[0-9|:|.]{12}Z$/.test(result.file[key])) {
        let date = (0, _moment2.default)(result.file[key], _moment2.default.ISO_8601, true);
        if (date.isValid()) result.file[key] = date;
      }
    });
    return result.file;
  }
  /**
   * ### all
   * retrieve all files
   * @returns {Object} paths as keys, similar structure to ms files structure
   */
  all() {
    const results = {};
    this.collection.data.forEach(doc => {
      results[doc.path] = doc.file;
    });
    return results;
  }
  /**
   * ### match
   * applies multimatch mask to stored files
   * @param {String} mask minimatch globbed mask
   * @returns {Object} paths as keys, similar structure to ms files structure
   */
  match(mask) {
    const results = {};
    this.collection.data.forEach(doc => {
      if (!(0, _minimatch2.default)(doc.path, mask)) return;
      results[doc.path] = doc.file;
    });
    return results;
  }
  /**
   * ### remove
   * deletes file from cache
   * @param {String} path
   */
  remove(path) {
    const result = this.collection.findOne({ path });
    if (result) result.remove();
  }
}

/**
 * ## ValueCache
 * An interface for a key value cache
 */
class ValueCache {
  /**
   * ### constructor
   * @param {String} name a namespace
   */
  constructor(name) {
    this.collection = loki.getCollection(name) || loki.addCollection(name, { unique: 'key' });
  }
  /**
   * ### store
   * store a value
   * @param {String} key
   * @param {String|Object|Buffer} value pretty much anything
   */
  store(key, value) {
    const existing = this.collection.findOne({ key });
    if (existing) {
      existing.value = value;
      return this.collection.update(existing);
    }
    return this.collection.insert({ key, value });
  }
  /**
   * ### retrieve
   * retrieve a value
   * @param {String} key
   */
  retrieve(key) {
    const result = this.collection.findOne({ key });
    if (result) return result.value;
  }
}

exports.FileCache = FileCache;
exports.ValueCache = ValueCache;
exports.init = init;
exports.save = save;