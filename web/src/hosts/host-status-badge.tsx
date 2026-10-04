import type { HostStatus } from '@/__generated__/graphql';
import { Badge, type BadgeVariant } from '@/components/ui/badge';

/** How each status reads and which badge it wears. */
export const HOST_STATUS_LABELS = {
  ONLINE: { label: 'Online', variant: 'success' },
  UNREACHABLE: { label: 'Unreachable', variant: 'destructive' },
  PENDING: { label: 'Waiting', variant: 'secondary' },
} as const satisfies Record<HostStatus, { label: string; variant: BadgeVariant }>;

/**
 * The pill naming a host's status.
 *
 * @param props.status - The host's status.
 */
export function HostStatusBadge({ status }: { status: HostStatus }) {
  const { label, variant } = HOST_STATUS_LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}
