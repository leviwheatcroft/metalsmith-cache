import Loki from 'lokijs'
import multimatch from 'multimatch'
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

function init (cb) {
  if (cb) return loaded.promise().then(cb)
  return loaded.promise()
}

function save (cb) {
  const defer = vow.defer()
  defer.promise()
  .then(() => dbg('cache saved'))
  .then(cb)
  loki.saveDatabase(() => defer.resolve())
  return defer.promise()
}

class FileCache {
  constructor (name) {
    this.collection = (
      loki.getCollection(name) ||
      loki.addCollection(name, { unique: 'path' })
    )
  }
  store (path, file) {
    const doc = {path, file}
    const existing = this.collection.findOne({path})
    if (existing) return this.collection.update(existing, doc)
    return this.collection.insert(doc)
  }
  retrieve (path) {
    const result = this.collection.findOne({path})
    if (result) return result.file
  }
  all () {
    const results = {}
    this.collection.data.forEach((doc) => {
      results[doc.path] = doc.file
    })
    return results
  }
  match (mask) {
    this.collection.where((doc) => multimatch(mask, [doc.path]))
  }
}

class ValueCache {
  constructor (name) {
    this.collection = (
      loki.getCollection(name) ||
      loki.addCollection(name, { unique: 'key' })
    )
  }
  store (key, value) {
    const existing = this.collection.findOne({ key })
    if (existing) {
      existing.value = value
      this.collection.update(existing)
    } else {
      this.collection.insert({ key, value })
    }
  }
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
