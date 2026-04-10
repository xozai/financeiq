import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid'

const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments ?? 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
})

export const plaidClient = new PlaidApi(config)

export async function createLinkToken(userId: string) {
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'FinanceIQ',
    products: [Products.Transactions, Products.Investments, Products.Liabilities],
    country_codes: [CountryCode.Us],
    language: 'en',
  })
  return response.data
}

export async function exchangePublicToken(publicToken: string) {
  const response = await plaidClient.itemPublicTokenExchange({ public_token: publicToken })
  return response.data
}

export async function getAccounts(accessToken: string) {
  const response = await plaidClient.accountsGet({ access_token: accessToken })
  return response.data.accounts
}

export async function getTransactions(accessToken: string, startDate: string, endDate: string) {
  const response = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
  })
  return response.data.transactions
}

export async function getInvestments(accessToken: string) {
  const response = await plaidClient.investmentsHoldingsGet({ access_token: accessToken })
  return response.data
}

export async function getLiabilities(accessToken: string) {
  const response = await plaidClient.liabilitiesGet({ access_token: accessToken })
  return response.data.liabilities
}
