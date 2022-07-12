use crate::git_helper::GitHelper;
use git_hash::{ oid, ObjectId };
use git_object::tree;
use git_odb::Find;
use git_traverse::tree::recorder;
use crate::blockchain;

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

    async fn deploy_snapshot(&mut self, file_path: &str, id: &ObjectId) -> Result<()> {
        let mut buffer: Vec<u8> = Vec::new();
        let content = self
            .context
            .local_repository()
            .objects
            .try_find(id, &mut buffer)?
            .expect("blob must be in the local repository")
            .decode()?
            .as_blob()
            .expect("It must be a blob object")
            .data; 
        blockchain::snapshot::push_initial_snapshot(
            self.context,
            &self.ancestor_commit,
            &self.new_branch,
            file_path,
            content
        ).await?;
        Ok(())
    }

    async fn push_initial_snapshots(&mut self) -> Result<()> {
        let all_files:Vec<recorder::Entry> = {
            self.context
                .local_repository()
                .find_object(self.ancestor_commit)?
                .into_commit()
                .tree()?
                .traverse()
                .breadthfirst
                .files()?
                .into_iter()
                .collect()
        };
        let snapshots_to_deploy: Vec<recorder::Entry> = all_files
            .into_iter()
            .filter(|e| match e.mode {
                tree::EntryMode::Blob 
                | tree::EntryMode::BlobExecutable => true,
                tree::EntryMode::Link => true,
                tree::EntryMode::Tree => false,
                tree::EntryMode::Commit => {
                    panic!("Commits of git submodules are not  supported yet");
                }
            })
            .collect();
        
        for entry in snapshots_to_deploy {
            let full_path = entry.filepath.to_string();
            self.deploy_snapshot(&full_path, &entry.oid);
        }  
        Ok(())
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
