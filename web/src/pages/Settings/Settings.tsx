import { useRecoilValue } from 'recoil';
import CopyClipboard from '../../components/CopyClipboard';
import { userStateAtom } from 'web-common/lib/store/user.state';
import { shortString } from 'web-common/lib/utils';
import { TUserState } from 'web-common/lib/types/types';

const SettingsPage = () => {
    const userState = useRecoilValue<TUserState>(userStateAtom);

    return (
        <div>
            <h3 className="text-xl font-semibold">My public key</h3>
            <p>Share it with DAO owner to add you to participants list</p>
            {userState.keys && (
                <CopyClipboard
                    className="mt-4"
                    label={shortString(`0x${userState.keys.public}`, 10, 10)}
                    componentProps={{
                        text: `0x${userState.keys.public}`,
                    }}
                />
            )}
        </div>
    );
};

export default SettingsPage;
