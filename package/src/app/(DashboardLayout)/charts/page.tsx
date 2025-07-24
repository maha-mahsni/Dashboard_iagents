'use client';
import React from 'react';
import { Container } from '@mui/material';
import Charts from '@/app/(DashboardLayout)/components/dashboard/charts/charts';

export default function Page({ params }: { params: { id: string }}) {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Charts agentId={parseInt(params.id, 10)} />
    </Container>
  );
}
