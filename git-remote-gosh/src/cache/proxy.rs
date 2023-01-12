use async_trait::async_trait;
use crate::cache::Cache;
use crate::cache::memcached_impl::Memcached;
use crate::cache::Cacheable;

pub struct CacheProxy {
    subject: CacheSubject
}

enum CacheSubject {
    NoCache,
    Memcached(Memcached)
}

#[async_trait]
impl Cache for CacheProxy {
    async fn put<TKey, TValue>(&mut self, key: TKey, value: TValue) -> bool
    where
        TValue: Cacheable,
        TKey: Into<String> + Send
    {
        use CacheSubject::*;
        match &mut self.subject {
            NoCache => return false,
            Memcached(memcached) => return memcached.put::<TKey, TValue>(key, value).await
        }
    }
    async fn get<TKey, TValue>(&mut self, key: TKey) -> Option<TValue>
    where
        TValue: Cacheable,
        TKey: Into<String> + Send
    {
        use CacheSubject::*;
        match &mut self.subject {
            NoCache => return None,
            Memcached(memcached) => return memcached.get::<TKey, TValue>(key).await
        }
    }
}

impl CacheProxy {
    pub fn new() -> Self {
        return CacheProxy {
            subject: CacheSubject::NoCache
        };
    }
}
