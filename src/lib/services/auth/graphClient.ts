import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

// Ensure required environment variables are configured

/**
 * Create Microsoft Graph client for server-side operations
 */
function createGraphClient(): Client | null {
  try {
    if (!process.env.AZURE_AD_CLIENT_ID || !process.env.AZURE_AD_CLIENT_SECRET || !process.env.AZURE_AD_TENANT_ID) {
      return null;
    }

    const credential = new ClientSecretCredential(
      process.env.AZURE_AD_TENANT_ID,
      process.env.AZURE_AD_CLIENT_ID,
      process.env.AZURE_AD_CLIENT_SECRET
    );

    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    });

    return Client.initWithMiddleware({ authProvider });
  } catch (error) {
    return null;
  }
}

export interface GraphUser {
  id: string;
  userPrincipalName: string;
  displayName: string;
  mail: string | null;
  jobTitle: string | null;
  department: string | null;
  officeLocation: string | null;
  mobilePhone: string | null;
  businessPhones: string[];
  city: string | null;
  country: string | null;
  companyName: string | null;
  employeeId: string | null;
  employeeType: string | null;
  givenName: string | null;
  surname: string | null;
}

/**
 * Search for users in Active Directory
 * @param query - Search query (name or email)
 * @param limit - Maximum number of results
 * @returns Array of users matching the query
 */
export async function searchADUsers(query: string, limit: number = 20): Promise<GraphUser[]> {
  const client = createGraphClient();
  
  if (!client) {
    throw new Error('Microsoft Graph client not configured');
  }

  try {
    // Search users by displayName or userPrincipalName
    const response = await client
      .api('/users')
      .filter(`startswith(displayName,'${query}') or startswith(userPrincipalName,'${query}') or startswith(mail,'${query}')`)
      .select('id,userPrincipalName,displayName,mail,jobTitle,department,officeLocation,mobilePhone,businessPhones,city,country,companyName,employeeId,employeeType,givenName,surname')
      .top(limit)
      .get();

    return response.value || [];
  } catch (error) {
    throw new Error('Failed to search Active Directory users');
  }
}

/**
 * Get a specific user from Active Directory by ID or email
 * @param userIdOrEmail - User ID or email address
 * @returns User details or null if not found
 */
export async function getADUser(userIdOrEmail: string): Promise<GraphUser | null> {
  const client = createGraphClient();
  
  if (!client) {
    throw new Error('Microsoft Graph client not configured');
  }

  try {
    const user = await client
      .api(`/users/${userIdOrEmail}`)
      .select('id,userPrincipalName,displayName,mail,jobTitle,department,officeLocation,mobilePhone,businessPhones,city,country,companyName,employeeId,employeeType,givenName,surname')
      .get();

    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Get multiple users from Active Directory
 * @param limit - Maximum number of users to return
 * @returns Array of users
 */
export async function listADUsers(limit: number = 50): Promise<GraphUser[]> {
  const client = createGraphClient();
  
  if (!client) {
    throw new Error('Microsoft Graph client not configured');
  }

  try {
    const response = await client
      .api('/users')
      .select('id,userPrincipalName,displayName,mail,jobTitle,department,officeLocation,mobilePhone,businessPhones,city,country,companyName,employeeId,employeeType,givenName,surname')
      .top(limit)
      .orderby('displayName')
      .get();

    return response.value || [];
  } catch (error) {
    throw new Error('Failed to list Active Directory users');
  }
}






