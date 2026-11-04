type ClientName = {
  clientName?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  cid?: string;
};

/** Portal display name; never use this as a transaction recipient identifier. */
export function getClientDisplayName(client?: ClientName | null): string {
  if (!client) return '';
  return client.clientName?.trim()
    || [client.firstName, client.lastName].filter(Boolean).join(' ').trim()
    || client.companyName?.trim()
    || client.cid
    || 'Unnamed';
}

/** Keep the stored recipient value while showing the portal client name. */
export function getAccountLabel(client: ClientName | null | undefined, recipient: string): string {
  if (client && recipient === `${client.firstName} ${client.lastName}`) {
    return getClientDisplayName(client);
  }
  return recipient;
}
