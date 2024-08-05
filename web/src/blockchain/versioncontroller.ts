import { TonClient } from "@eversdk/core";
import { GoshError } from "../errors";
import { TSystemContract } from "../types/blockchain.types";
import { SystemContract } from "./systemcontract";
import VersionControllerABI from "./abi/versioncontroller.abi.json";
import { BaseContract } from "./contract";
import { DaoProfile } from "./daoprofile";
import { UserProfileIndex } from "./userprofileindex";
import { getAllAccounts } from "./utils";

export class VersionController extends BaseContract {
  versions: { [ver: string]: string } = {};

  constructor(
    client: TonClient,
    address: string,
    versions: { [ver: string]: string },
  ) {
    super(client, VersionControllerABI, address);
    this.versions = versions;
  }

  getSystemContract(version?: string): TSystemContract {
    const versions = Object.keys(this.versions);
    version = version || versions[versions.length - 1];
    const address = this.versions[version];
    // debugger;
    switch (version) {
      // case '1.0.0':
      //   return new SystemContract1(this.client, address)
      // case '2.0.0':
      //   return new SystemContract2(this.client, address)
      // case '3.0.0':
      //   return new SystemContract3(this.client, address)
      // case '4.0.0':
      //   return new SystemContract4(this.client, address)
      // case '5.0.0':
      //   return new SystemContract5(this.client, address)
      // case '5.1.0':
      //   return new SystemContract5_1(this.client, address)
      // case '6.0.0':
      //   return new SystemContract6(this.client, address)
      // case '6.1.0':
      //   return new SystemContract6_1(this.client, address)
      // case '6.2.0':
      //   return new SystemContract6_2(this.client, address)
      // case '7.0.0':
      //   return new SystemContract7_0(this.client, address)
      default:
        return new SystemContract(this.client, address);
        throw new GoshError("Version not found", { version });
    }
  }

  async getHashFromCell(cell: string) {
    const { value0 } = await this.runLocal(
      "getHashCell",
      { state: cell },
      undefined,
      {
        useCachedBoc: true,
      },
    );
    return value0;
  }

  async getEventPropIdFromCell(cell: string) {
    const { value0 } = await this.runLocal(
      "getPropIdFromCell",
      { propData: cell },
      undefined,
      { useCachedBoc: true },
    );
    return value0;
  }

  async getUserProfileIndex(params: {
    address?: string;
    pubkey?: string;
    username?: string;
  }) {
    const { address, pubkey, username } = params;
    if (address) {
      return new UserProfileIndex(this.account.client, address);
    }
    if (!pubkey || !username) {
      throw new GoshError("Username and/or pubkey missing");
    }

    const { value0 } = await this.runLocal(
      "getProfileIndexAddr",
      {
        pubkey,
        name: username,
      },
      undefined,
      { useCachedBoc: true },
    );
    return new UserProfileIndex(this.account.client, value0);
  }

  async getUserProfileIndexes(
    pubkey: string,
  ): Promise<{ pubkey: string; name: string; profile: string }[]> {
    const { value0: code } = await this.runLocal(
      "getProfileIndexCode",
      { pubkey },
      undefined,
      { useCachedBoc: true },
    );
    const { hash } = await this.account.client.boc.get_boc_hash({ boc: code });
    const accounts = await getAllAccounts({
      filters: [`code_hash: {eq:"${hash}"}`],
    });
    return await Promise.all(
      accounts.map(async ({ id }) => {
        const index = await this.getUserProfileIndex({ address: id });
        const { value0, value1, value2 } = await index.runLocal("getData", {});
        return { pubkey: value0, name: value1, profile: value2 };
      }),
    );
  }

  async getDaoProfile(name: string) {
    const { value0 } = await this.runLocal(
      "getProfileDaoAddr",
      { name },
      undefined,
      {
        useCachedBoc: true,
      },
    );
    return new DaoProfile(this.client, value0);
  }

  async getCommitTagCode(params: {
    tagcode: string;
    repoaddr: string;
    version: string;
  }): Promise<string> {
    const { tagcode, repoaddr, version } = params;
    const { value0 } = await this.runLocal(
      "getTagCode",
      { tagcode, repo: repoaddr, ver: version },
      undefined,
      { useCachedBoc: true },
    );
    return value0;
  }
}
