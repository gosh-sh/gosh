import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PreviousStep from './PreviousStep'
import { GoshError } from '../../../../errors'
import { ToastError } from '../../../../components/Toast'
import PhraseForm from '../../../../components/PhraseForm'

const generateRandomWordNumbers = () => {
  const min = 0
  const max = 11
  const numbers: number[] = []
  while (true) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min
    if (numbers.indexOf(num) < 0) {
      numbers.push(num)
    }
    if (numbers.length === 3) {
      break
    }
  }
  return numbers.sort((a, b) => a - b)
}

type TGoshPhraseCheckProps = {
  signupState: {
    phrase: string[]
    username: string
  }
  setStep: React.Dispatch<
    React.SetStateAction<'username' | 'submit' | 'phrase' | 'phrase-check' | undefined>
  >
}

const GoshPhraseCheck = (props: TGoshPhraseCheckProps) => {
  const { signupState, setStep } = props
  const [rndNumbers, setRndNumbers] = useState<number[]>([])

  const onBackClick = () => {
    setStep('phrase')
  }

  const onFormSubmit = async (values: { words: string[] }) => {
    try {
      const { words } = values
      const validated = rndNumbers.map((n, index) => {
        return words[index] === signupState.phrase[n]
      })
      if (!validated.every((v) => !!v)) {
        throw new GoshError('Words check failed')
      }
      setStep('username')
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }

  useEffect(() => {
    setRndNumbers(generateRandomWordNumbers())
  }, [])

  return (
    <>
      <div className="flex flex-wrap gap-6 items-center mb-8">
        <PreviousStep onClick={onBackClick} />
        <div>
          <h3 className="text-xl font-medium">Verify the secret</h3>
        </div>
      </div>

      <div className="w-full lg:w-5/12">
        <div className="p-8 border border-gray-e6edff rounded-xl">
          <h3 className="mb-2">
            Input words{' '}
            <span className="font-medium">
              {rndNumbers.map((n) => n + 1).join(' - ')}
            </span>{' '}
            of your phrase
          </h3>
          <PhraseForm wordCount={3} btnSubmitContent="Continue" onSubmit={onFormSubmit} />
        </div>
      </div>
    </>
  )
}

export default GoshPhraseCheck
