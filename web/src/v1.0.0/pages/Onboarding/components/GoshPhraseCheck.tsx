import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../components/Toast'
import PreviousStep from './PreviousStep'
import { GoshError } from '../../../../errors'
import PhraseForm from '../../../../components/PhraseForm/PhraseForm'
import { TOAuthSession } from '../../../types/oauth.types'
import { useOnboardingData } from '../../../hooks/onboarding.hooks'

type TGoshPhraseProps = {
  oauth: TOAuthSession
}

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

const GoshPhraseCheck = (props: TGoshPhraseProps) => {
  const { oauth } = props
  const {
    data: { phrase },
    updateData,
  } = useOnboardingData(oauth)
  const [rndNumbers, setRndNumbers] = useState<number[]>([])

  const onBackClick = () => {
    updateData({ step: 'phrase' })
  }

  const onFormSubmit = async (values: { words: string[] }) => {
    try {
      const { words } = values
      const validated = words.map((w, index) => {
        return w === phrase[rndNumbers[index]]
      })
      if (!validated.every((v) => !!v)) {
        throw new GoshError('Words check failed')
      }
      updateData({ step: 'username' })
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }

  useEffect(() => {
    setRndNumbers(generateRandomWordNumbers())
  }, [])

  return (
    <div className="flex flex-wrap items-center">
      <div className="basis-1/2 p-0 lg:p-16">
        <div className="mb-6">
          <PreviousStep onClick={onBackClick} />
        </div>

        <div className="mb-8 text-3xl font-medium">Let's set up your GOSH account</div>

        <div className="text-gray-53596d">
          Please input requested words from your phrase to ensure it is written correctly
        </div>
      </div>

      <div className="grow basis-0 border border-gray-e6edff rounded-xl p-8">
        <h3 className="mb-2">
          Input words{' '}
          <span className="font-medium">{rndNumbers.map((n) => n + 1).join(' - ')}</span>{' '}
          of your phrase
        </h3>
        <PhraseForm wordCount={3} btnSubmitContent="Continue" onSubmit={onFormSubmit} />
      </div>
    </div>
  )
}

export default GoshPhraseCheck
