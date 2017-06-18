import Nedb from 'nedb'
import minimatch from 'minimatch'
import vow from 'vow'
import debug from 'debug'
import {
  resolve
} from 'path'
import BSON from 'bson'
const bson = new BSON()
const dbg = debug('metalsmith-cache')
const cacheRoot = 'cache'
// if (!global.nedb) {
//   global.nedb = new Nedb({filename: 'cache.db'})
//   nedb.loadDatabase({}, () => loaded.resolve(nedb))
// }

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
    this.collection = new Nedb(resolve(cacheRoot, `${name}-files.db`))
    this.collection.loadDatabase()
  }
  storeFile (path, file) {
    const defer = vow.defer()
    file.path = path
    let doc = this.fileAsDoc(file)
    this.collection.update(
      {path},
      doc,
      {upsert: true},
      (err) => {
        if (err) return defer.reject(err)
        defer.resolve()
      }
    )
    return defer.promise()
  }
  storeFiles (files) {
    const defer = vow.defer()
    try {
      Object.keys(files).forEach(async (path) => {
        await this.storeFile(path, files[path])
      })
      defer.resolve()
    } catch (err) {
      defer.reject(err)
    }
    return defer.promise()
  }

  /**
   * ### store
   * store files
   * call with `store(files)` or `store(path, file)`
   *
   * @param {Object|String} files as it appears in ms files structure
   * @param {Object} file as it appears in ms files structure
   */
  store (files, file) {
    // alt syntax
    if (file) return this.storeFile(files, file)
    return this.storeFiles(files)
  }
  /**
   * ### retrieve
   * retrieve a file
   * @param {String} path as it appears in ms files structure
   * @returns {Object} the file object
   */
  retrieve (path) {
    const defer = vow.defer()
    this.collection.findOne({path}).exec((err, doc) => {
      if (err) defer.reject(err)
      defer.resolve(this.docAsFile(doc))
    })
    return defer.promise()
  }
  fileAsDoc (file) {
    return {
      path: file.path,
      file: bson.serialize(file).toString('base64')
    }
  }
  docAsFile (doc) {
    return bson.deserialize(
      Buffer.from(doc.file, 'base64'),
      {promoteBuffers: true}
    )
  }
  docsAsFiles (docs) {
    if (!Array.isArray(docs)) docs = [docs]
    return Object.assign.apply(null, docs.map((doc) => {
      return {[doc.path]: this.docAsFile(doc)}
    }))
  }
  /**
   * ### all
   * retrieve all files
   * @returns {Object} paths as keys, similar structure to ms files structure
   */
  all () {
    const defer = vow.defer()
    this.collection.find({}).exec((err, docs) => {
      if (err) defer.reject(err)
      defer.resolve(this.docsAsFiles(docs))
    })
    return defer.promise()
  }
  paths () {
    const defer = vow.defer()
    this.collection.find({}, {path: 1}).exec((err, docs) => {
      if (err) defer.reject(err)
      defer.resolve(docs.map((doc) => doc.path))
    })
    return defer.promise()
  }
  /**
   * ### match
   * applies multimatch mask to stored files
   * @param {String} mask minimatch globbed mask
   * @returns {Object} paths as keys, similar structure to ms files structure
   */
  match (mask) {
    return this.all()
    .then((docs) => {
      docs = docs.map((doc) => minimatch(doc.path, mask)).filter((e) => e)
      return this.docsAsFiles(docs)
    })
  }
  /**
   * ### remove
   * deletes file from cache
   * @param {String} path
   */
  remove (path) {
    const defer = vow.defer()
    this.collection.remove({path}, {}, (err) => {
      if (err) defer.reject(err)
      else defer.resolve()
    })
    return defer.promise()
  }
  /**
   * ## clear
   *
   */
  invalidate () {
    const defer = vow.defer()
    this.collection.remove({}, {multi: true}, callback(defer))
    return defer.promise()
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
    this.collection = new Nedb(resolve(cacheRoot, `${name}-values.db`))
    this.collection.loadDatabase()
  }
  /**
   * ### store
   * store a value
   * @param {String} key
   * @param {String|Object|Buffer} value pretty much anything
   */
  store (key, value) {
    const defer = vow.defer()
    this.collection.update(
      {key},
      {key, value},
      {upsert: true},
      callback(defer)
    )
    return defer.promise()
  }

  /**
   * ### retrieve
   * retrieve a value
   * @param {String} key
   */
  retrieve (key) {
    const defer = vow.defer()
    this.collection.findOne({ key }, (err, doc) => {
      if (err) return defer.reject(err)
      if (!doc) return defer.reject(`no record for ${key}`)
      defer.resolve(doc.value)
    })
    return defer.promise()
  }
  invalidate () {
    const defer = vow.defer()
    this.collection.remove({}, {multi: true}, callback(defer))
    return defer.promise()
  }
}
/**
 * ## Callback
 * takes care of some boilerplate
 */
function callback (deferred) {
  return (err, result) => {
    if (err) deferred.reject(err)
    else deferred.resolve(result)
  }
}

export {
  FileCache,
  ValueCache
}
