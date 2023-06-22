use crate::cache::{Cache, CacheKey, Cacheable};
use async_trait::async_trait;
use memcache;
use std::sync::Arc;

pub struct Memcached {
    client: Arc<memcache::Client>,
    /// Note:
    /// This memcache will be used for multiple runs and it is possible to have
    /// exactly the same repositories in different dao's.
    /// To resolve this issue suffix is used.
    namespace_suffix: String,
}

#[async_trait]
impl Cache for Memcached {
    async fn put<TKey, TValue>(&self, key: TKey, value: TValue)
    where
        TValue: Cacheable,
        TKey: CacheKey,
    {
        let local_key: String = key.key().into();
        let memcache_key = self.to_global_key(local_key);
        let result: std::result::Result<(), memcache::MemcacheError> =
            self.client.set(&memcache_key, value, 0);
        if let Err(e) = result {
            tracing::trace!("Caching error (set): {}", e);
        }
    }
    async fn get<TKey, TValue>(&self, key: TKey) -> Option<TValue>
    where
        TValue: Cacheable,
        TKey: CacheKey,
    {
        let local_key: String = key.key().into();
        let memcache_key = self.to_global_key(local_key);
        let result: Result<Option<TValue>, memcache::MemcacheError> =
            self.client.get(&memcache_key);
        match result {
            Ok(r) => return r,
            Err(e) => {
                tracing::trace!("Caching error (get): {}", e);
                return None;
            }
        }
    }
}

impl Memcached {
    pub fn new(address: &str, namespace_suffix: &str) -> anyhow::Result<Memcached> {
        let client = memcache::connect(address)?;
        return Ok(Memcached {
            client: Arc::new(client),
            namespace_suffix: namespace_suffix.to_owned(),
        });
    }

    fn to_global_key(&self, local_key: String) -> String {
        return local_key + &self.namespace_suffix;
    }
}
