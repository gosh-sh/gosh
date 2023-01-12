use async_trait::async_trait;
use crate::cache::Cache;
use crate::cache::Cacheable;

pub struct Memcached {
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
