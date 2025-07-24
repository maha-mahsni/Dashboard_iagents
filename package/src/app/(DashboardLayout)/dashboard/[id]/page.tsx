'use client';
import React, { use } from 'react';
import { Container } from '@mui/material';
import ChartsComponent from '@/app/(DashboardLayout)/components/dashboard/charts/charts';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const agentId = parseInt(id, 10);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <ChartsComponent agentId={agentId} />
    </Container>
  );
}
