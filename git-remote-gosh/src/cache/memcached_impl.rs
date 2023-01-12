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
    async fn put<TKey, TValue>(&mut self, key: TKey, value: TValue) -> bool
    where
        TValue: Cacheable,
        TKey: Into<String> + Send
    {
        todo!();
    }
    async fn get<TKey, TValue>(&mut self, key: TKey) -> Option<TValue>
    where
        TValue: Cacheable,
        TKey: Into<String> + Send
    {
        todo!();
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
