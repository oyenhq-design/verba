export function createClient() {
  // MOCKED for UI testing without env vars
  return {
    auth: {
      getUser: async () => ({ data: { user: null } }),
    }
  } as unknown;
}
