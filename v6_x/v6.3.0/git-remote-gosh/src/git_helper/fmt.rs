use super::GitHelper;
use std::fmt;

impl<Blockchain> fmt::Debug for GitHelper<Blockchain> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("GitHelper")
            .field("repo_addr", &self.repo_addr)
            .field("local_repository", &self.local_repository.path())
            .finish_non_exhaustive()
    }
}
