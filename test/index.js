import {
  FileCache,
  ValueCache
} from '../lib/index.js'
import {
  unlinkSync as unlink
} from 'fs'
// import debug from 'debug'
import Metalsmith from 'metalsmith'
// const dbg = debug('metalsmith-cache')
const testDir = 'test/fixtures'
import assert from 'assert'
import vow from 'vow'

const namespace = 'test'

describe('metalsmith-cache', () => {
  // clean up
  after((done) => {
    unlink('cache/test-files.db')
    unlink('cache/test-values.db')
    done()
  })

  it('should be able to store and retrieve a file', (done) => {
    const path = 'one.html'
    const defer = vow.defer()
    Metalsmith(testDir)
    .use((files) => {
      assert.ok(files[path], 'incorrect path specified')
      const fileCache = new FileCache(namespace)
      return fileCache.store(path, files[path])
    })
    .use((files) => {
      const fileCache = new FileCache(namespace)
      fileCache.retrieve(path)
      .then((file) => {
        assert.ok(file, 'file not retrieved?')
        assert.ok(file.date instanceof Date, 'date not converted')
        assert.ok(Buffer.isBuffer(file.contents), 'contents not converted')
      })
    })
    .build(defer.resolve.bind(defer))
    defer.promise().then(done)
  })

  it('should be able to store and retrieve a value', (done) => {
    const defer = vow.defer()
    Metalsmith(testDir)
    .use(() => {
      const valueCache = new ValueCache(namespace)
      return valueCache.store('testKey', 'testValue')
    })
    .use(() => {
      const valueCache = new ValueCache(namespace)
      valueCache.retrieve('testKey')
      .then((value) => {
        assert.equal(value, 'testValue', 'retrieved incorrect value')
      })
    })
    .build(defer.resolve.bind(defer))
    defer.promise().then(done)
  })

  it('should be able to clear cache', (done) => {
    vow.resolve()
    .then(() => {
      const defer = vow.defer()
      const fileCache = new FileCache(namespace)
      fileCache.collection.find({}, (err, docs) => {
        if (err) defer.reject(err)
        assert.notEqual(docs.length, 0, 'nothing to clear')
        fileCache.invalidate()
        .then(() => {
          fileCache.collection.find({}, (err, docs) => {
            if (err) defer.reject(err)
            assert.equal(docs.length, 0, 'docs still present')
            defer.resolve()
          })
        })
      })
      return defer.promise()
    })
    .then(() => {
      const defer = vow.defer()
      const valueCache = new ValueCache(namespace)
      valueCache.collection.find({}, (err, docs) => {
        if (err) defer.reject(err)
        assert.notEqual(docs.length, 0, 'nothing to clear')
        valueCache.invalidate()
        .then(() => {
          valueCache.collection.find({}, (err, docs) => {
            if (err) defer.reject(err)
            assert.equal(docs.length, 0, 'docs still present')
            defer.resolve()
          })
        })
      })
      return defer.promise()
    })
    .then(done)
  })
})
