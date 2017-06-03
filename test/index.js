import {
  FileCache,
  ValueCache,
  init,
  save
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
    save()
    .then(() => unlink('cache.json'))
    .then(done)
  })

  it('should be able to store and retrieve a file', (done) => {
    const path = 'one.html'
    init()
    .then(() => {
      const defer = vow.defer()
      Metalsmith(testDir)
      .use((files) => {
        assert.ok(files[path], 'incorrect path specified')
        const fileCache = new FileCache(namespace)
        fileCache.store(path, files[path])
        return save()
      })
      .use((files) => {
        const fileCache = new FileCache(namespace)
        const file = fileCache.retrieve(path)
        assert.ok(file, 'file not retrieved?')
        assert.ok(file.date instanceof Date, 'date not converted')
      })
      .build(defer.resolve.bind(defer))
      return defer.promise()
    })
    .then(done)
  })

  it('should be able to store and retrieve a value', (done) => {
    init()
    .then(() => {
      const defer = vow.defer()
      Metalsmith(testDir)
      .use(() => {
        const valueCache = new ValueCache(namespace)
        valueCache.store('testKey', 'testValue')
        return save()
      })
      .use(() => {
        const valueCache = new ValueCache(namespace)
        assert.equal(
          valueCache.retrieve('testKey'),
          'testValue',
          'retrieved incorrect value'
        )
      })
      .build(defer.resolve.bind(defer))
      return defer.promise()
    })
    .then(done)
  })

  it('should be able to clear cache', (done) => {
    init()
    .then(() => {
      const fileCache = new FileCache(namespace)
      const valueCache = new ValueCache(namespace)
      assert.notEqual(fileCache.collection.data.length, 0, 'nothing to clear')
      assert.notEqual(valueCache.collection.data.length, 0, 'nothing to clear')
      fileCache.collection.clear()
      valueCache.collection.clear()
      assert.equal(fileCache.collection.data.length, 0, 'FileCache not clear')
      assert.equal(valueCache.collection.data.length, 0, 'ValueCache not clear')
    })
    .then(() => save())
    .then(done)
  })
})
