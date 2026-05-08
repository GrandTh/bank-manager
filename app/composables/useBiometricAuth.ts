const CREDENTIAL_KEY = 'budget-biometric-credential'
const SESSION_KEY = 'budget-biometric-session'

function b64encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function b64decode(s: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Array.from(atob(s), c => c.charCodeAt(0)))
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(n)
  crypto.getRandomValues(buf)
  return buf
}

export const useBiometricAuth = () => {
  const isAuthenticated = useState('biometricAuth', () =>
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1'
  )

  const isSupported = computed(() =>
    typeof window !== 'undefined' && !!window.PublicKeyCredential
  )

  const isRegistered = ref(
    typeof localStorage !== 'undefined' && !!localStorage.getItem(CREDENTIAL_KEY)
  )

  async function register(): Promise<boolean> {
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: randomBytes(32),
          rp: { id: window.location.hostname, name: 'Budget' },
          user: {
            id: randomBytes(16),
            name: 'budget-user',
            displayName: 'Budget'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' }
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred'
          },
          timeout: 60000
        }
      }) as PublicKeyCredential | null

      if (!credential) return false

      localStorage.setItem(CREDENTIAL_KEY, b64encode(credential.rawId))
      isRegistered.value = true
      sessionStorage.setItem(SESSION_KEY, '1')
      isAuthenticated.value = true
      return true
    } catch {
      return false
    }
  }

  async function authenticate(): Promise<boolean> {
    const stored = localStorage.getItem(CREDENTIAL_KEY)
    if (!stored) return false

    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: randomBytes(32),
          allowCredentials: [{ id: b64decode(stored), type: 'public-key' }],
          userVerification: 'required',
          timeout: 60000
        }
      })

      if (assertion) {
        isAuthenticated.value = true
        return true
      }
      return false
    } catch {
      return false
    }
  }

  function reset() {
    localStorage.removeItem(CREDENTIAL_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    isRegistered.value = false
    isAuthenticated.value = false
  }

  return { isAuthenticated, isSupported, isRegistered, register, authenticate, reset }
}
