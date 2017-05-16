


## lokijs

There's some weirdness to be aware of when using lokijs

### don't mutate objects stored in docs

```
let doc = {foo: 'bar'}
collection.insert(doc)
doc.foo = 'baz'
db.save() // will save {foo: 'baz'}
```

### multiple instances of collections aren't synced

```
let loki = new Loki(...)
let foo1 = loki.getCollection('foo')
let foo2 = loki.getCollection('foo')
foo1.count() // 0
foo1.insert({...})
foo2.count() // 0
```
