import PhraseForm from '../../../components/PhraseForm'

type TSigninPhraseFormProps = {
    onSubmit(values: { words: { value: string; index: number }[] }): Promise<void>
}

const SigninPhraseForm = (props: TSigninPhraseFormProps) => {
    const { onSubmit } = props

    return (
        <>
            <div className="mt-4 mb-10 text-center text-gray-53596d text-lg">
                Please, write your seed phrase
            </div>
            <PhraseForm btnPaste btnClear onSubmit={onSubmit} />
        </>
    )
}

export default SigninPhraseForm
