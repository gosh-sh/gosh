import { TonClient } from "@eversdk/core";
import { BaseContract } from "./contract";
import SmvLockerABI from "./abi/smvtokenlocker.abi.json";

export class SmvLocker extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, SmvLockerABI, address);
  }
}
