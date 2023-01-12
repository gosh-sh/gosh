use async_trait::async_trait;
use memcache;

#[async_trait]
pub trait Cache {
    /// Try putting a value into the cache.
    /// Note: It doesn't guarantee that the value will be stored
    async fn put<TKey, TValue>(&mut self, key: TKey, value: TValue)
    where
        TValue: Cacheable,
        TKey: Into<String> + Send;

    async fn get<TKey, TValue>(&mut self, key: TKey) -> Option<TValue>
    where
        TValue: Cacheable,
        TKey: Into<String> + Send;
}


pub trait Cacheable :
    memcache::ToMemcacheValue<memcache::Stream>
    + memcache::FromMemcacheValue
    + Send
{
}

pub mod proxy;
pub mod memcached_impl;
