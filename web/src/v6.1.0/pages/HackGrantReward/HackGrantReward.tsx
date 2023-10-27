import randomColor from 'randomcolor'
import {
    faChevronDown,
    faList,
    faPencil,
    faPlus,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '../../../components/Form'
import { Badge, BadgeTag } from '../../components/Badge'
import { getIdenticonAvatar } from '../../../helpers'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import classNames from 'classnames'
import { faClock } from '@fortawesome/free-regular-svg-icons'
import { Link } from 'react-router-dom'

const HackGrantRewardPage = () => {
    const [poolOpen, setPoolOpen] = useState<boolean>(false)

    const onPoolToggle = () => {
        setPoolOpen(!poolOpen)
    }

    return (
        <div className="row flex-wrap">
            <div className="col !basis-full lg:!basis-7/12">
                <div className="border border-gray-e6edff rounded-xl overflow-hidden">
                    <div className="p-5 flex items-center justify-between border-b border-b-gray-e6edff">
                        <div>
                            <FontAwesomeIcon
                                icon={faList}
                                size="xs"
                                className="mr-4 text-gray-7c8db5"
                            />
                            <span className="text-blue-2b89ff font-medium">
                                REWARDS.md
                            </span>
                        </div>
                        <div>
                            <Button variant="custom" className="!p-0 text-gray-7c8db5">
                                <FontAwesomeIcon icon={faPencil} />
                            </Button>
                        </div>
                    </div>
                    <div className="p-5">content</div>
                </div>
            </div>
            <div className="col !basis-full lg:!basis-5/12">
                <div className="flex flex-col gap-y-5">
                    <div className="border border-gray-e6edff rounded-xl overflow-hidden px-5">
                        <div className="border-b border-b-gray-e6edff overflow-hidden">
                            <Button
                                variant="custom"
                                className="!px-0 !py-4 w-full flex items-center justify-between"
                                onClick={onPoolToggle}
                            >
                                <div className="text-xl font-medium">Prize pool</div>
                                <div className="text-xl font-medium flex flex-nowrap items-center">
                                    245,500
                                    <FontAwesomeIcon
                                        icon={faChevronDown}
                                        className={classNames(
                                            'ml-3 font-normal text-xs transition-transform duration-200',
                                            poolOpen ? 'rotate-180' : 'rotate-0',
                                        )}
                                    />
                                </div>
                            </Button>
                            <AnimatePresence>
                                {poolOpen && (
                                    <motion.div
                                        className="flex flex-col gap-2 mb-3"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {new Array(3).fill(0).map((_, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between gap-4 px-2 py-1 rounded-md
                                                bg-gradient-to-r from-[#FF8412]/25 via-[#FF846C]/25 to-[#FF8412]/25"
                                            >
                                                <div className="text-lg font-medium">
                                                    Place #{index + 1}
                                                </div>
                                                <div className="text-lg">145,500</div>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="py-5 border-b border-b-gray-e6edff">
                            <div className="flex items-center justify-between gap-6">
                                <div
                                    className="px-3 py-1.5 border border-[#2B89FF]/25 rounded-2xl
                                bg-[#2B89FF]/15 text-blue-2b89ff font-medium"
                                >
                                    <FontAwesomeIcon icon={faClock} className="mr-2.5" />
                                    Ongoing 1 day 14 hours left
                                </div>
                                <div className="grow text-end">16 Participants</div>
                            </div>
                        </div>

                        <div className="py-5 border-b border-b-gray-e6edff">
                            <h3 className="mb-2.5 text-sm font-medium">
                                Your applications
                            </h3>
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-nowrap items-center gap-x-2.5">
                                    <div className="w-8">
                                        <img
                                            src={getIdenticonAvatar({
                                                seed: 'roman',
                                                radius: 50,
                                            }).toDataUriSync()}
                                            alt=""
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="text-sm">
                                        <span>roman</span>
                                        <span className="mx-1">/</span>
                                        <Link to="" className="text-blue-2b89ff">
                                            _index
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4">
                                <Button
                                    variant="custom"
                                    size="sm"
                                    className="border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                    Add another application
                                </Button>
                            </div>
                        </div>

                        <div className="py-5">
                            <Button className="w-full flex flex-nowrap items-center justify-center">
                                Add organization to participate
                                <FontAwesomeIcon
                                    icon={faChevronDown}
                                    className="ml-3 font-normal text-xs"
                                />
                            </Button>
                        </div>
                    </div>

                    <hr className="bg-gray-e6edff" />

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
                                            <div className="text-blue-2b89ff font-medium">
                                                {name}
                                            </div>
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
                                                                backgroundColor:
                                                                    randomColor({
                                                                        seed: name,
                                                                        luminosity:
                                                                            'light',
                                                                        format: 'rgba',
                                                                        alpha: 0.35,
                                                                    }),
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="font-medium">
                                                    1912 Karma
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HackGrantRewardPage
