package util

import (
	"sync"
	"time"
)

// CacheEntry represents a single cached value with expiry.
type CacheEntry struct {
	Value     any
	ExpiresAt time.Time
}

// Cache is a simple in-memory TTL cache using sync.Map.
type Cache struct {
	data sync.Map
}

// NewCache creates a new in-memory cache.
func NewCache() *Cache {
	c := &Cache{}
	// Start background cleanup every 5 minutes
	go c.cleanup()
	return c
}

// Set stores a value with the given TTL.
func (c *Cache) Set(key string, value any, ttl time.Duration) {
	c.data.Store(key, CacheEntry{
		Value:     value,
		ExpiresAt: time.Now().Add(ttl),
	})
}

// Get retrieves a value by key. Returns nil and false if not found or expired.
func (c *Cache) Get(key string) (any, bool) {
	raw, ok := c.data.Load(key)
	if !ok {
		return nil, false
	}
	entry := raw.(CacheEntry)
	if time.Now().After(entry.ExpiresAt) {
		c.data.Delete(key)
		return nil, false
	}
	return entry.Value, true
}

// cleanup periodically removes expired entries.
func (c *Cache) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		c.data.Range(func(key, value any) bool {
			entry := value.(CacheEntry)
			if time.Now().After(entry.ExpiresAt) {
				c.data.Delete(key)
			}
			return true
		})
	}
}
