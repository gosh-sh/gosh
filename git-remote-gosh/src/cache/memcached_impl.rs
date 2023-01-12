use async_trait::async_trait;
use crate::cache::Cache;
use crate::cache::Cacheable;
use std::sync::Arc;
use memcache;

pub struct Memcached {
    client: Arc<memcache::Client>
}


#[async_trait]
impl Cache for Memcached {
    async fn put<TKey, TValue>(&mut self, key: TKey, value: TValue)
    where
        TValue: Cacheable,
        TKey: Into<String> + Send
    {
        let key: String = key.into();
        let result: std::result::Result<(), memcache::MemcacheError> = self.client.set(&key, value, 0);
        if let Err(e) = result {
            tracing::trace!("Caching error (set): {}", e);
        }
    }
    async fn get<TKey, TValue>(&mut self, key: TKey) -> Option<TValue>
    where
        TValue: Cacheable,
        TKey: Into<String> + Send
    {
        let key: String = key.into();
        let result: Result<Option<TValue>, memcache::MemcacheError> = self.client.get(&key);
        match result {
            Ok(r) => return r,
            Err(e) => {
                tracing::trace!("Caching error (get): {}", e);
                return None
            }
        }
    }
}

impl Memcached {
    pub fn new(address: &str) -> anyhow::Result<Memcached> {
        let client = memcache::connect(address)?;
        return Ok(Memcached{
            client: Arc::new(client)
        });
    }
}
