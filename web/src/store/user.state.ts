import { atom } from "recoil";
import { TUser, TUserPersist } from "../types/user.types";
import { persistAtom } from "./base";

import { selector } from "recoil";
import { AppConfig } from "../appconfig";
import { UserProfile } from "../blockchain/userprofile";
import { contextVersion } from "../constants";

const userPersistAtom = atom<TUserPersist>({
  key: "UserPersistAtom",
  default: {},
  effects_UNSTABLE: [persistAtom],
});

const userAtom = atom<TUser>({
  key: "UserAtom",
  default: {},
  dangerouslyAllowMutability: true,
});

const userProfileSelector = selector<UserProfile | null>({
  key: `UserProfileSelector_${contextVersion}`,
  get: ({ get }) => {
    const user = get(userAtom);
    if (!user.profile || !user.keys) {
      return null;
    }
    return new UserProfile(AppConfig.goshclient, user.profile, user.keys);
  },
  dangerouslyAllowMutability: true,
});

export { userProfileSelector };

export { userAtom, userPersistAtom };
