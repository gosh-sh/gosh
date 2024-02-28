import PhraseForm from '../../../components/PhraseForm'

type TSigninPhraseFormProps = {
  onSubmit(values: { words: string[] }): Promise<void>
}

const SigninPhraseForm = (props: TSigninPhraseFormProps) => {
  const { onSubmit } = props

  return (
    <>
      <div className="mt-4 mb-10 text-center text-gray-53596d text-lg">
        Please, write your seed phrase
      </div>
      <PhraseForm
        btnPaste
        btnClear
        btnSubmitContent="Sign in"
        btnSubmitProps={{
          size: 'lg',
          testId: 'btn-signin',
        }}
        onSubmit={onSubmit}
      />
    </>
  )
}

export default SigninPhraseForm
