import Loki from 'lokijs'
import minimatch from 'minimatch'
import vow from 'vow'
import debug from 'debug'

const dbg = debug('metalsmith-debug')

// promise to keep track of load state
const loaded = vow.defer()
loaded.promise()
.then(() => dbg('cache loaded'))

// instantiate & load
export const loki = new Loki(
  'cache.json'
)
loki.loadDatabase({}, () => loaded.resolve(loki))

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
function init (cb) {
  if (cb) return loaded.promise().then(cb)
  return loaded.promise()
}

/**
 * ## save
 * Writes db to disk
 *
 * @param {Function} cb callback
 * @returns {Promise}
 */
function save (cb) {
  const defer = vow.defer()
  defer.promise()
  .then(() => dbg('cache saved'))
  .then(cb)
  loki.saveDatabase(() => defer.resolve())
  return defer.promise()
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
  constructor (name) {
    this.collection = (
      loki.getCollection(name) ||
      loki.addCollection(name, { unique: 'path' })
    )
  }
  /**
   * ### store
   * store a file
   * @param {String} path as it appears in ms files structure
   * @param {Object} file as it appears in ms files structure
   */
  store (path, file) {
    const doc = {path, file}
    const existing = this.collection.findOne({path})
    if (existing) return this.collection.update(existing, doc)
    return this.collection.insert(doc)
  }
  /**
   * ### retrieve
   * retrieve a file
   * @param {String} path as it appears in ms files structure
   * @returns {Object} the file object
   */
  retrieve (path) {
    const result = this.collection.findOne({path})
    if (result) return result.file
  }
  /**
   * ### all
   * retrieve all files
   * @returns {Object} paths as keys, similar structure to ms files structure
   */
  all () {
    const results = {}
    this.collection.data.forEach((doc) => {
      results[doc.path] = doc.file
    })
    return results
  }
  /**
   * ### match
   * applies multimatch mask to stored files
   * @param {String} mask minimatch globbed mask
   * @returns {Object} paths as keys, similar structure to ms files structure
   */
  match (mask) {
    const results = {}
    this.collection.data.forEach((doc) => {
      if (!minimatch(doc.path, mask)) return
      results[doc.path] = doc.file
    })
    return results
  }
  /**
   * ### remove
   * deletes file from cache
   * @param {String} path
   */
  remove (path) {
    const result = this.collection.findOne({path})
    if (result) result.remove()
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
  constructor (name) {
    this.collection = (
      loki.getCollection(name) ||
      loki.addCollection(name, { unique: 'key' })
    )
  }
  /**
   * ### store
   * store a value
   * @param {String} key
   * @param {String|Object|Buffer} value pretty much anything
   */
  store (key, value) {
    const existing = this.collection.findOne({ key })
    if (existing) {
      existing.value = value
      return this.collection.update(existing)
    }
    return this.collection.insert({ key, value })
  }
  /**
   * ### retrieve
   * retrieve a value
   * @param {String} key
   */
  retrieve (key) {
    const result = this.collection.findOne({ key })
    if (result) return result.value
  }
}

export {
  FileCache,
  ValueCache,
  init,
  save
}
