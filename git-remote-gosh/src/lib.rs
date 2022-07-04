#[macro_use]
extern crate lazy_static;

#[allow(unused_imports)]
#[macro_use] 
extern crate serde;

#[allow(unused_imports)]
#[macro_use]
extern crate serde_json;

extern crate base64_serde;
extern crate base64;

extern crate git_object;
extern crate git_hash;

#[macro_use]
extern crate data_contract_macro_derive;

pub(crate) mod git_helper;
pub mod ipfs;
pub(crate) mod logger;
pub mod abi;
pub mod config;
pub mod blockchain;
pub mod git;
pub mod util;

use std::{env::args, error::Error};

pub async fn run() -> Result<(), Box<dyn Error>> {
    let logger = logger::init()?;
    let config = config::Config::init()?;
    log::info!("Start");

    let url = args()
        .nth(2)
        .ok_or("Wrong args for git-remote call\nRequired: <name> <url>")?;
    crate::git_helper::run(config, &url, logger).await?;

    log::info!("Finish");
    Ok(())
}
