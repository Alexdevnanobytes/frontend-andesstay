export const environment = {
  tenantId: 'SET_TENANT_ID',
  frontendClientId: 'SET_FRONTEND_CLIENT_ID',
  apiClientId: 'SET_API_CLIENT_ID',
  apiBase: '', // Local: proxy Angular. AWS: https://ID.execute-api.REGION.amazonaws.com
  apiScope: 'api://SET_API_CLIENT_ID/access_as_user',
  redirectUri: 'http://localhost:4200/'
};
