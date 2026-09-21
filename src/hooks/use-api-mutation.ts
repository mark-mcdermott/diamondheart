import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/app/api";

interface ApiMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Query keys to refetch once the call has settled, whichever way it went. */
  invalidates: readonly (readonly unknown[])[];
  onSuccess?: (data: TData, variables: TVariables) => void;
}

/** A write that surfaces its failure as a toast and refetches what it touched. */
export function useApiMutation<TData, TVariables = void>({ mutationFn, invalidates, onSuccess }: ApiMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess,
    onError: (error: unknown) => toast.error(errorMessage(error)),
    onSettled: () => Promise.all(invalidates.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}
