import useSWR from 'swr'

import fetch from '../libs/fetch'

function useProjects() {
  const x = useSWR('/api/data', fetch)
  console.log('useSWR return ', x)
  return x
}

export default useProjects
