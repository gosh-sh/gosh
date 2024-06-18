import { useEffect, useState } from 'react'
import { useSetRecoilState } from 'recoil'
import PhraseForm from '../../../../components/PhraseForm'
import { appModalStateAtom } from '../../../../store/app.state'
import { PinCodeModal } from '../../../components/Modal'
import { useUserSignup } from '../../../hooks/user.hooks'
import { PreviousStep } from './PreviousStep'

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

const PhraseCheckForm = () => {
  const { data, setStep, submitPhraseCheckStep } = useUserSignup()
  const setModal = useSetRecoilState(appModalStateAtom)
  const [rndNumbers, setRndNumbers] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const onFormSubmit = async (values: { words: string[] }) => {
    try {
      setIsSubmitting(true)
      await submitPhraseCheckStep({ words: values.words, numbers: rndNumbers })
      setModal({
        static: true,
        isOpen: true,
        element: (
          <PinCodeModal
            phrase={data.phrase.join(' ')}
            onUnlock={() => setStep('complete')}
          />
        ),
      })
    } catch (e: any) {
      console.error(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    setRndNumbers(generateRandomWordNumbers())
  }, [])

  return (
    <div className="flex flex-wrap items-center justify-center gap-14">
      <div className="basis-full md:basis-6/12 lg:basis-4/12 text-center lg:text-start">
        <div className="mb-6">
          <PreviousStep step="phrase" disabled={isSubmitting} />
        </div>
        <div className="mb-8 text-3xl font-medium">Let's set up your GOSH account</div>
        <div className="text-gray-53596d">
          Please input requested words from your phrase to ensure it is written correctly
        </div>
      </div>

      <div className="basis-full md:basis-6/12 lg:basis-5/12 xl:basis-4/12">
        <div className="border border-gray-e6edff rounded-xl p-8">
          <h3 className="mb-2">
            Input words{' '}
            <span className="font-medium">
              {rndNumbers.map((n) => n + 1).join(' - ')}
            </span>{' '}
            of your phrase
          </h3>
          <PhraseForm
            wordCount={3}
            btnSubmitContent="Create account"
            onSubmit={onFormSubmit}
          />
        </div>
      </div>
    </div>
  )
}

export { PhraseCheckForm }
