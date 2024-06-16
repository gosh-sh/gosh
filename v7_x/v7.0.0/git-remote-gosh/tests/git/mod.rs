// #[tokio::test]
// #[ignore = "this test is obsolite and randomly passes rn"]
// async fn test_push() -> anyhow::Result<()> {
//     tracing::info!("Preparing repository for tests");
//     // TODO: rewrite from libgit2 to gitoxide
//     let dir = std::env::temp_dir().join("test_push");

//     fs::remove_dir_all(&dir).unwrap_or(());
//     fs::create_dir_all(&dir)?;
//     fs::write(dir.join("readme.txt").to_owned(), "test")?;
//     tracing::info!("Initializing git repo");
//     println!("Testing push {:?}", dir);

//     let repo = Repository::init(dir).expect("repository init successfuly");
//     repo.remote_set_url(
//             "origin",
//             "gosh::vps23.ton.dev://0:54fdd2ac8027b16c83b2b8b0cc4360ff4135a936c355bdb5c4776bdd3190fefc/dadao/somefiles",
//         )?;

//     let mut index = repo.index()?;
//     index.add_all(["*"].iter(), IndexAddOption::DEFAULT, None)?;
//     index.write()?;

//     let tree = index.write_tree()?;

//     let author = Signature::new("tester", "test@test.test", &Time::new(0, 0))?;

//     let update_ref = Some("HEAD");

//     repo.commit(
//         update_ref,
//         &author,
//         &author,
//         "message",
//         &repo.find_tree(tree)?,
//         &[],
//     )?;

//     let head = repo.head()?;
//     println!("head {:?}", head.name());
//     let full_ref = repo.resolve_reference_from_short_name("main")?;
//     let commit = repo.reference_to_annotated_commit(&full_ref)?;

//     println!("commit {:?}", commit.id());

//     // get current branch
//     let _branch = Branch::wrap(head);
//     // set upstream
//     // branch set upstream "origin"
//     // branch.set_upstream(repo.remotes()?.get(0))?;

//     // get remote ref
//     // let remote_ref = repo.branch_remote_name()

//     // push

//     // push_ref()

//     Ok(())
// }
