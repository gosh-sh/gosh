import { AppConfig } from 'react-gosh'
import DaoCreateForm_1_0_0 from './1.0.0/DaoCreateForm'
import DaoCreateForm_1_1_0 from './1.1.0/DaoCreateForm'

const DaoCreatePage = () => {
    const goshLatestVersion = Object.keys(AppConfig.versions).reverse()[0]

    if (goshLatestVersion === '1.0.0') {
        return <DaoCreateForm_1_0_0 />
    }
    if (goshLatestVersion === '1.1.0') {
        return <DaoCreateForm_1_1_0 />
    }
    return <DaoCreateForm_1_1_0 />
}

export default DaoCreatePage
