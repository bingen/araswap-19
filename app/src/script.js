import '@babel/polyfill'
import { of } from 'rxjs'
import AragonApi from '@aragon/api'

const INITIALIZATION_TRIGGER = Symbol('INITIALIZATION_TRIGGER')

const api = new AragonApi()

api.store(
  async (state, event) => {
    let newState = state

    switch (event.event) {
      case INITIALIZATION_TRIGGER:
      case 'addedToPool':
      case 'Increment':
      case 'Decrement':
        newState = {
          eth: await getValue(),
          tokens: await getTokens(),
          ratio: await getCurrentRatio(),
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
  return api.call('ethValue').toPromise()
}

async function getTokens() {
  return api.call('tokenValue').toPromise()
}

async function getCurrentRatio() {
  return api.call('currentRatio').toPromise()
}
