import 'fake-indexeddb/auto'
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

// Reset IndexedDB and Pinia before each test for full isolation
beforeEach(() => {
  // Fresh in-memory IndexedDB — no state leaks between tests
  globalThis.indexedDB = new IDBFactory()

  setActivePinia(createPinia())
})
