import PhraseForm from '../../components/PhraseForm'

type TSigninPhraseFormProps = {
    onSubmit(values: { words: string[] }): Promise<void>
}

const SigninPhraseForm = (props: TSigninPhraseFormProps) => {
    const { onSubmit } = props

    return (
        <div className="signin__phrase-form phrase-form">
            <div className="px-9 sm:px-2 mt-0 sm:mt-2 mb-10 text-center text-gray-606060 text-lg sm:text-xl leading-normal">
                Please, write your seed phrase
            </div>
            <PhraseForm
                btnPaste
                btnClear
                btnSubmitContent="Sign in"
                btnSubmitProps={{
                    size: 'xl',
                }}
                onSubmit={onSubmit}
            />
        </div>
    )
}

export default SigninPhraseForm
