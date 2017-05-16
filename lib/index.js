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

export function init (cb) {
  if (cb) return loaded.promise().then(cb)
  return loaded.promise()
}

export function save (cb) {
  const defer = vow.defer()
  defer.promise()
  .then(() => dbg('cache saved'))
  .then(cb)
  loki.saveDatabase(() => defer.resolve())
  return defer.promise()
}

export const files = (
  loki.getCollection('files') ||
  loki.addCollection('files', { unique: 'path' })
)
files.store = (path, file) => {
  const doc = {path, file}
  const existing = files.findOne({path})
  if (existing) return files.update(existing, doc)
  return files.insert(doc)
}
files.retrieve = (path) => {
  const result = files.findOne({path})
  if (result) return result.file
}
files.all = () => {
  const results = {}
  files.data.forEach((doc) => {
    results[doc.path] = doc.file
  })
  return results
}
files.match = (mask) => {
  files.where((doc) => {
    return multimatch(mask, [doc.path])
  })
}

export function getStore (name) {
  const store = (
    loki.getCollection(name) ||
    loki.addCollection(name, { unique: 'key' })
  )
  store.store = (key, value) => {
    const existing = store.findOne({ key })
    if (existing) {
      existing.value = value
      store.update(existing)
    } else {
      store.insert({ key, value })
    }
  }
  store.retrieve = key => {
    const result = store.findOne({ key })
    if (result) return result.value
  }
  return store
}
