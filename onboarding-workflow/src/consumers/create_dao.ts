import { createDao } from '../actions/dao.ts'
import { createDaoConsumer } from '../queues/mod.ts'

createDaoConsumer().process(async (job) => {
    console.log('Got', job.data)
    const { dao_name } = job.data
    await createDao(dao_name)
})
