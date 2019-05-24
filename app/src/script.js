import '@babel/polyfill'
import { of } from 'rxjs'
import AragonApi from '@aragon/api'

const INITIALIZATION_TRIGGER = Symbol('INITIALIZATION_TRIGGER')

const api = new AragonApi()

api.store(
  async (state, event) => {
    let newState

    switch (event.event) {
      case INITIALIZATION_TRIGGER:
        newState = {
          eth: await getValue(),
          tokens: await getTokens(),
          ratio: await getCurrentRatio()
        }
        break
      case 'Increment':
        newState = {
          eth: await getValue(),
          tokens: await getTokens(),
          ratio: await getCurrentRatio()
        }
        break
      case 'Decrement':
        newState = {
          eth: await getValue(),
          tokens: await getTokens(),
          ratio: await getCurrentRatio()
        }
        break
      default:
        newState = state
    }

    return newState
  },
  [
    // Always initialize the store with our own home-made event
    of({ event: INITIALIZATION_TRIGGER }),
  ]
)

async function getValue() {
  return parseInt(await api.call('value').toPromise(), 10)
}

async function getTokens() {
  return parseInt(await api.call('value').toPromise(), 10)
}

async function getRatio() {
  return parseInt(await api.call('value').toPromise(), 10)
}
