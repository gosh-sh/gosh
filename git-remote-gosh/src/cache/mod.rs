use async_trait::async_trait;
use memcache;

#[async_trait]
pub trait Cache {
    /// Try putting a value into the cache.
    /// Note: It doesn't guarantee that the value will be stored
    /// Note: it uses immutable reference. It may require iternal
    /// mutability for some implementations.
    async fn put<TKey, TValue>(&self, key: TKey, value: TValue)
    where
        TKey: CacheKey,
        TValue: Cacheable;

    async fn get<TKey, TValue>(&self, key: TKey) -> Option<TValue>
    where
        TValue: Cacheable,
        TKey: CacheKey;
}

pub trait Cacheable:
    memcache::ToMemcacheValue<memcache::Stream> + memcache::FromMemcacheValue + Send
{
}

pub trait CacheKey: Send {
    type TKey: Into<String>;
    fn key(&self) -> Self::TKey;
}

impl Cacheable for u32 {}

impl CacheKey for &git_hash::ObjectId {
    type TKey = String;

    fn key(&self) -> Self::TKey {
        return self.to_string();
    }
}

pub mod memcached_impl;
pub mod proxy;
