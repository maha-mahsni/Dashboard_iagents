'use client'
import React from "react";
import { Container } from "@mui/material";
import Charts from '../components/dashboard/charts/charts'
export default function Page() {
  return (
   <Container maxWidth="lg" sx={{ mt: 4 }}>
  <Charts />
  </Container>
  );
}
