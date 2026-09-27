import {
  PublicClientApplication,
  type Configuration,
  type AccountInfo,
} from '@azure/msal-browser'

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || ''
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || 'common'

export const msalConfigured = Boolean(clientId)

const msalConfig: Configuration = {
  auth: {
    clientId: clientId || '00000000-0000-0000-0000-000000000000',
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin + '/sign-in',
    postLogoutRedirectUri: window.location.origin + '/',
  },
  cache: {
    cacheLocation: 'localStorage',
  },
}

export const msalInstance = new PublicClientApplication(msalConfig)

let initPromise: Promise<void> | null = null

export function ensureMsal(): Promise<void> {
  if (!initPromise) {
    initPromise = msalInstance.initialize()
  }
  return initPromise
}

export async function loginWithMicrosoftPopup(): Promise<string> {
  if (!msalConfigured) {
    throw new Error('未配置 VITE_AZURE_CLIENT_ID，无法使用 Microsoft 登录')
  }
  await ensureMsal()
  const result = await msalInstance.loginPopup({
    scopes: ['User.Read', 'openid', 'profile', 'email'],
    prompt: 'select_account',
  })
  const account = result.account
  if (account) {
    msalInstance.setActiveAccount(account)
  }
  if (result.accessToken) return result.accessToken

  return acquireTokenSilent(account)
}

async function acquireTokenSilent(account: AccountInfo | null): Promise<string> {
  await ensureMsal()
  const active = account || msalInstance.getActiveAccount()
  if (!active) throw new Error('No Microsoft account')
  const result = await msalInstance.acquireTokenSilent({
    account: active,
    scopes: ['User.Read', 'openid', 'profile', 'email'],
  })
  return result.accessToken
}
