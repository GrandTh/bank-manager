const KEY = 'nav-collapsed'

export const useNavCollapsed = () => {
  const state = useState<boolean>('navCollapsed', () => {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(KEY) === 'true'
  })

  return computed({
    get: () => state.value,
    set: (val: boolean) => {
      state.value = val
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(KEY, String(val))
      }
    }
  })
}
