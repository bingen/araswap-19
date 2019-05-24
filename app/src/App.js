import React from 'react'
import { useAragonApi } from '@aragon/api-react'
import { Main, Button } from '@aragon/ui'
import styled from 'styled-components'

function App() {
  const { api, appState } = useAragonApi()
  const { eth, tokens, ratio, syncing } = appState
  return (
    <Main>
      <BaseLayout>
        {syncing && <Syncing />}
        <Count>ETH: {eth}</Count>
        <Count>Tokens: {tokens}</Count>
        <Count>Ratio: {ratio}</Count>
        <Buttons>
          <Button mode="secondary" onClick={() => api.addToPool(10)}>
            Add to Pool
          </Button>
          <Button mode="secondary" onClick={() => api.sellTokens(10)}>
            Sell Tokens
          </Button>
          <Button mode="secondary" onClick={() => api.buyTokens(10)}>
            Buy Tokens
          </Button>
        </Buttons>
      </BaseLayout>
    </Main>
  )
}

const BaseLayout = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  flex-direction: column;
`

const Count = styled.h1`
  font-size: 30px;
`

const Buttons = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-gap: 40px;
  margin-top: 20px;
`

const Syncing = styled.div.attrs({ children: 'Syncing…' })`
  position: absolute;
  top: 15px;
  right: 20px;
`

export default App
