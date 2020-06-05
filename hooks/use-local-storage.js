import { useState } from 'react'
import useSSR from 'use-ssr'

export default function useMyLocalStorage(key, initialValue) {
  const { isServer } = useSSR()
  if (isServer) return [initialValue, () => {}]

  const [state, setState] = useState(() => {
    try {
      const localStorageValue = localStorage.getItem(key);
      if (localStorageValue !== null) {
        return JSON.parse(localStorageValue);
      } else {
        initialValue && localStorage.setItem(key, JSON.stringify(initialValue));
        return initialValue;
      }
    } catch {
      // If user is in private mode or has storage restriction
      // localStorage can throw. JSON.parse and JSON.stringify
      // can throw, too.
      return initialValue;
    }
  })

  const set = (valOrFunc) => {
    try {
      const newState = typeof valOrFunc === 'function' ? valOrFunc(state) : valOrFunc
      if (typeof newState === 'undefined') return
      let value = JSON.stringify(newState)
      localStorage.setItem(key, value);
      setState(newState);
    } catch {
      // If user is in private mode or has storage restriction
      // localStorage can throw. Also JSON.stringify can throw.
    }
  }

  const val = (() => {
    try {
      const localStorageValue = localStorage.getItem(key);
      if (localStorageValue !== null) {
        return JSON.parse(localStorageValue);
      } else {
        initialValue && localStorage.setItem(key, JSON.stringify(initialValue));
        return initialValue;
      }
    } catch {
      // If user is in private mode or has storage restriction
      // localStorage can throw. Also JSON.stringify can throw.
    }
  })()
  // const keysplit = key.split('-')
  // console.log(`(${keysplit[keysplit.length - 1]}) def-val`, initialValue, 'state', state, 'val', val, 'l:', localStorage.getItem(key))
  return [val, set]
}