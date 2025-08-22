import { DomainOverview } from "./domain-overview";

interface DomainVerificationProps {
  projectId: string;
}

export function DomainVerification({ projectId }: DomainVerificationProps) {
  return (
    <DomainOverview projectId={projectId} />
  );
}