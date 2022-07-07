use crate::git_helper::GitHelper;
use git_hash::ObjectId;
use git_object::tree;
use git_traverse::tree::recorder;

pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

pub struct CreateBranchOperation<'a> {
    ancestor_commit: ObjectId,
    new_branch: String,
    context: &'a mut GitHelper,
}

impl<'a> CreateBranchOperation<'a> {
    pub fn new(
        ancestor_commit: ObjectId,
        branch_name: impl Into<String>,
        context: &'a mut GitHelper,
    ) -> Self {
        return Self {
            ancestor_commit: ancestor_commit,
            new_branch: branch_name.into(),
            context: context,
        };
    }

    async fn prepare_commit_for_branching(&mut self) -> Result<()> {
        // We must prepare root tree for this commit
        // It needs to know a number of all blobs
        // in the entire tree
        todo!();
    }

    async fn preinit_branch(&mut self) -> Result<()> {
        // wallet -> deployBranch
        todo!();
    }

    async fn deploy_snapshot(&mut self, file_path: &str, data: &[u8]) -> Result<()> {
        todo!();
    }

    async fn push_initial_snapshots(&mut self) -> Result<()> {
        let ancestor_commit_tree = self
            .context
            .local_repository()
            .find_object(self.ancestor_commit)?
            .into_commit()
            .tree()?;
        let snapshots_to_deploy: Vec<&recorder::Entry> = ancestor_commit_tree
            .traverse()
            .breadthfirst
            .files()?
            .iter()
            .filter(|e| match e.mode {
                tree::EntryMode::Blob | tree::EntryMode::BlobExecutable => true,
                tree::EntryMode::Link => true,
                tree::EntryMode::Tree => false,
                tree::EntryMode::Commit => {
                    panic!("Commits of git submodules are not  supported yet");
                }
            })
            .collect();
        // for each snapshot call wallet -> deployNewSnapshot
        //
        todo!();
    }

    async fn wait_branch_ready(&mut self) -> Result<()> {
        // Ensure repository contract state
        // Ping Sergey Horelishev for details
        todo!();
    }

    pub async fn run(&mut self) -> Result<()> {
        self.prepare_commit_for_branching().await?;
        self.preinit_branch().await?;
        self.push_initial_snapshots().await?;
        self.wait_branch_ready().await?;
        Ok(())
    }
}
