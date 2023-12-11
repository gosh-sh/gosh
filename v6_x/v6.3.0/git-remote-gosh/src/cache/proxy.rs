use crate::cache::memcached_impl::Memcached;
use crate::cache::{Cache, CacheKey, Cacheable};
use async_trait::async_trait;

pub struct CacheProxy {
    subject: CacheSubject,
}

enum CacheSubject {
    NoCache,
    Memcached(Memcached),
}

#[async_trait]
impl Cache for CacheProxy {
    async fn put<TKey, TValue>(&self, key: TKey, value: TValue)
    where
        TValue: Cacheable,
        TKey: CacheKey,
    {
        use CacheSubject::*;
        match &self.subject {
            NoCache => return,
            Memcached(memcached) => return memcached.put::<TKey, TValue>(key, value).await,
        }
    }
    async fn get<TKey, TValue>(&self, key: TKey) -> Option<TValue>
    where
        TValue: Cacheable,
        TKey: CacheKey,
    {
        use CacheSubject::*;
        match &self.subject {
            NoCache => return None,
            Memcached(memcached) => return memcached.get::<TKey, TValue>(key).await,
        }
    }
}

impl CacheProxy {
    pub fn new() -> Self {
        return CacheProxy {
            subject: CacheSubject::NoCache,
        };
    }

    pub fn set_memcache(&mut self, memcache: Memcached) {
        self.subject = CacheSubject::Memcached(memcache);
    }
}
