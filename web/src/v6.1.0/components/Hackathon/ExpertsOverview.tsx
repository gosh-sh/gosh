import randomColor from 'randomcolor'
import { getIdenticonAvatar } from '../../../helpers'
import { Badge, BadgeTag } from '../Badge'

const HackathonExpertsOverview = () => {
    return (
        <div>
            <div className="pb-5 flex items-center gap-2">
                <div className="text-lg font-medium">36 Experts in</div>
                <div className="grow flex items-center gap-2">
                    {['ai', 'web3'].map((name, index) => (
                        <Badge
                            key={index}
                            content={name}
                            className="!text-sm"
                            style={{
                                color: randomColor({
                                    seed: name,
                                    luminosity: 'dark',
                                }),
                                backgroundColor: randomColor({
                                    seed: name,
                                    luminosity: 'light',
                                    format: 'rgba',
                                    alpha: 0.35,
                                }),
                            }}
                        />
                    ))}
                </div>
            </div>
            <div className="border border-gray-e6edff rounded-xl overflow-hidden px-5">
                <div
                    className="py-4 w-full flex items-center justify-between
                                border-b border-b-gray-e6edff"
                >
                    <div className="font-medium">Top 5 by total karma</div>
                </div>

                <div className="py-5 divide-y divide-gray-e6edff">
                    {new Array(5).fill('futurizt').map((name, index) => (
                        <div key={index} className="flex gap-x-6 py-4">
                            <div className="w-14">
                                <img
                                    src={getIdenticonAvatar({
                                        seed: name,
                                        radius: 50,
                                    }).toDataUriSync()}
                                    alt=""
                                    className="w-full"
                                />
                            </div>
                            <div className="grow">
                                <div className="text-blue-2b89ff font-medium">{name}</div>
                                <div className="mt-2 flex items-center justify-between gap-x-6">
                                    <div className="grow flex items-center gap-x-1">
                                        {['ai', 'web3'].map((name, index) => (
                                            <BadgeTag
                                                key={index}
                                                content={name}
                                                className="!py-0.5 !text-xs"
                                                style={{
                                                    color: randomColor({
                                                        seed: name,
                                                        luminosity: 'dark',
                                                    }),
                                                    backgroundColor: randomColor({
                                                        seed: name,
                                                        luminosity: 'light',
                                                        format: 'rgba',
                                                        alpha: 0.35,
                                                    }),
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="font-medium">1912 Karma</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export { HackathonExpertsOverview }
