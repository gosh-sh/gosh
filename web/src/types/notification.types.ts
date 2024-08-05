export enum ENotificationType {
  DAO_EVENT_CREATED = "dao_event_created",
  REPO_COMMIT_PUSHED = "repo_commit_pushed",
}

export type TUserNotificationSettings = {
  isFetching: boolean;
  data: {
    email: string | null;
    email_enabled: boolean | null;
    app_enabled: boolean | null;
  };
};

export type TDaoNotificationSettings = {
  isFetching: boolean;
  data: {
    types: { [name: string]: boolean };
  };
};

export type TUserNotificationList = {
  isFetching: boolean;
  unread: number;
  daolist: { daoname: string; selected: boolean }[];
  items: any[];
};
