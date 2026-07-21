'use client';

import React from 'react';
import { Container } from '@mui/material';
import Charts from '@/app/(DashboardLayout)/components/dashboard/charts/charts';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const [agentId, setAgentId] = React.useState<number | null>(null);

  React.useEffect(() => {
    params.then(({ id }) => {
      setAgentId(parseInt(id, 10));
    });
  }, [params]);

  if (agentId === null) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Charts agentId={agentId} />
    </Container>
  );
}
