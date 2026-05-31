type IndexQuery = {
  eq: (field: string, value: unknown) => IndexQuery;
};

type QueryBuilder = {
  withIndex: (name: string, callback: (query: IndexQuery) => unknown) => QueryBuilder;
  unique: () => Promise<any>;
  collect: () => Promise<any[]>;
};

export type QueryCtx = {
  auth: {
    getUserIdentity: () => Promise<{ subject: string } | null>;
  };
  db: {
    query: (table: string) => QueryBuilder;
    get: (id: string) => Promise<any>;
    insert: (table: string, value: Record<string, unknown>) => Promise<any>;
    patch: (id: string, value: Record<string, unknown>) => Promise<void>;
  };
};

export type MutationCtx = QueryCtx;

type FunctionConfig<Ctx> = {
  args: Record<string, unknown>;
  handler: (ctx: Ctx, args: any) => unknown;
};

export function query<T extends FunctionConfig<QueryCtx>>(config: T): T {
  return config;
}

export function mutation<T extends FunctionConfig<MutationCtx>>(config: T): T {
  return config;
}
