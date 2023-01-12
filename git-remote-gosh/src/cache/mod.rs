use async_trait::async_trait;
use memcache::{ToMemcacheValue, FromMemcacheValueExt};

#[async_trait]
pub trait Cache {
    async fn put<TKey, TValue>(&mut self, key: TKey, value: TValue) -> bool
    where
        TValue: Cacheable,
        TKey: Into<String> + Send;
    async fn get<TKey, TValue>(&mut self, key: TKey) -> Option<TValue>
    where
        TValue: Cacheable,
        TKey: Into<String> + Send;
}


pub trait Cacheable : Send
{
}

pub mod proxy;
pub mod memcached_impl;
