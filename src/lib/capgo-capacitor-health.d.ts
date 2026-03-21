declare module '@capgo/capacitor-health' {
	interface AuthorizationOptions {
		read: string[];
		write: string[];
	}

	interface AuthorizationResult {
		authorized?: boolean;
	}

	interface QueryOptions {
		sampleType: string;
		startDate: string;
		endDate: string;
		limit?: number;
	}

	interface AggregatedQueryOptions {
		sampleType: string;
		startDate: string;
		endDate: string;
		bucket: string;
	}

	interface QueryResult {
		data?: Array<Record<string, unknown>>;
	}

	export const CapacitorHealth: {
		requestAuthorization(opts: AuthorizationOptions): Promise<AuthorizationResult>;
		query(opts: QueryOptions): Promise<QueryResult>;
		queryAggregated(opts: AggregatedQueryOptions): Promise<QueryResult>;
	};
}
