use super::GitHelper;
use std::fmt;

impl fmt::Debug for GitHelper {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("GitHelper")
            .field("repo_addr", &self.repo_addr)
            .field("local_git_repository", &self.local_git_repository.path())
            .finish_non_exhaustive()
    }
}
