'use client';
import { useEffect, useState } from 'react';
import { Box, Paper, Typography, Stack, Divider } from '@mui/material';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface StatData {
  executions: number;
  temps_moyen: string;
  derniere_execution: string;
  taux_succes: string;
  tokens: number;
  cout: string;
  api: string;
  etat: string;
}

interface LogEntry {
  timestamp: string;
  message: string;
  duration?: number;
  success?: boolean;
}

interface PerformanceData {
  requetes_actives: number;
  file_attente: number;
  temps_reponse: number;
  courbe: { time: string; duration: number }[];
}

export default function AgentDetails() {
  const [stats, setStats] = useState<StatData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [picData, setPicData] = useState<{ heure: string, pic_utilisation: number }>({ heure: '00h', pic_utilisation: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch('http://localhost:8000/stats');
      const data = await res.json();
      setStats(data);

    };

    const fetchLogs = async () => {
      const res = await fetch('http://localhost:8000/logs');
      const data = await res.json();
      setLogs(data.slice(-5).reverse());
    };

    const fetchPerformance = async () => {
      const res = await fetch('http://localhost:8000/performance');
      const data = await res.json();
      setPerformance(data);
    };

    const fetchPic = async () => {
      const res = await fetch('http://localhost:8000/pic-usage');
      const data = await res.json();
      setPicData(data);
    };
    fetchStats();
    fetchLogs();
    fetchPerformance();
    fetchPic();

    const interval = setInterval(() => {
      fetchStats();
      fetchLogs();
      fetchPerformance();
      fetchPic();

    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!stats || !performance) return <Typography>Chargement...</Typography>;

  const getLabel = (log: LogEntry) => {
    if (log.message.toLowerCase().includes('timeout') || log.success === false) return 'ERROR';
    if ((log.duration ?? 0) > 3) return 'WARNING';
    return 'INFO';
  };

  const getColor = (label: string) => {
    switch (label) {
      case 'ERROR': return 'red';
      case 'WARNING': return 'orange';
      default: return 'dodgerblue';
    }
  };

  const getMessage = (log: LogEntry) => {
    const durationStr = log.duration ? ` (${log.duration}s)` : '';
    const msg = log.message.length > 50 ? log.message.slice(0, 50) + '...' : log.message;
    return `${msg}${durationStr}`;
  };

const chartOptions: ApexOptions = {
  chart: {
    id: 'realtime',
    toolbar: { show: false },
    type: 'area',
  },
  stroke: {
    curve: 'smooth',
    width: 3
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0,
      stops: [0, 90, 100],
    },
  },
  dataLabels: {
    enabled: false
  },
  colors: ['#6686f6ff'],
  xaxis: {
    categories: performance?.courbe?.map((pt) => pt.time) || [],
    title: {
      style: {
        fontSize: '14px',
        fontWeight: 'bold'
      }
    }
  },
  yaxis: {
    title: {
      text: 'Temps de réponse (s)',
      style: {
        fontSize: '14px',
        fontWeight: 'bold'
      }
    },
    min: 0
  },
  
};


const chartSeries = [
  {
    name: 'Temps de réponse (s)',
    data: performance?.courbe?.map((pt) => pt.duration) || []
  },
];


  return (
    <Stack spacing={3}>
      {/* Ligne 1 - Détails + Performance */}
      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
        {/* 📊 Détails Agent */}
        <Paper elevation={3} sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6" gutterBottom>📊 Détails Agent IA</Typography>
          <Stack spacing={1} mt={2}>
            <Box display="flex" justifyContent="space-between"><span>Nombre d’exécutions :</span><strong>{stats.executions}</strong></Box>
            <Box display="flex" justifyContent="space-between"><span>Temps moyen :</span><strong>{stats.temps_moyen}</strong></Box>
            <Box display="flex" justifyContent="space-between"><span>Dernière exécution :</span><strong>{stats.derniere_execution}</strong></Box>
            <Box display="flex" justifyContent="space-between"><span>Taux de succès :</span><strong>{stats.taux_succes}</strong></Box>
            <Box display="flex" justifyContent="space-between"><span>Tokens consommés :</span><strong>{stats.tokens}</strong></Box>
            <Box display="flex" justifyContent="space-between"><span>Coût total :</span><strong>{stats.cout}</strong></Box>
            <Box display="flex" justifyContent="space-between"><span>API utilisée :</span><strong>{stats.api}</strong></Box>
            <Box display="flex" justifyContent="space-between"><span>État de l'agent :</span>
              <strong style={{ color: stats.etat === "actif" ? "green" : "red" }}>{stats.etat}</strong>
            </Box>
          </Stack>
        </Paper>

        {/* 📈 Performance temps réel */}
        <Paper elevation={3} sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6" gutterBottom>📈 Performance temps réel</Typography>
          <ReactApexChart options={chartOptions} series={chartSeries} type="area" height={250} />
        
        </Paper>
      </Box>

      {/* Ligne 2 - Logs */}
      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>

        <Paper elevation={3} sx={{ p: 3, flex: 1 }}>
        <Typography variant="h6" gutterBottom>🪵 Logs récents</Typography>
        <Box sx={{
          background: '#1e1e2f', borderRadius: 2, color: 'white',
          fontFamily: 'monospace', fontSize: '14px', p: 2,
        }}>
          <Stack spacing={1}>
            {logs.map((log, index) => {
              const label = getLabel(log);
              return (
                <Box key={index} display="flex" gap={2}>
                  <span style={{ width: 60 }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ color: getColor(label), width: 70 }}>{label}</span>
                  <span>{getMessage(log)}</span>
                </Box>
              );
            })}
          </Stack>

        </Box>
      </Paper>
        <Paper elevation={3} sx={{ p: 3, flex: 1 }}>
  <Typography variant="h6" gutterBottom>⏱️ Pic d'utilisation</Typography>
  <ReactApexChart
    type="radialBar"
    height={250}
    series={[picData.pic_utilisation]}
    options={{
      chart: { type: 'radialBar' },
      plotOptions: {
        radialBar: {
          hollow: { size: '60%' },
          dataLabels: {
            name: { show: true, fontSize: '14px' },
            value: { show: true, fontSize: '20px' },
            total: {
              show: true,
              label: `Heure : ${picData.heure}`,
              fontSize: '14px'
            }
          }
        }
      },
      labels: ['Utilisation %'],
      colors: ['#6686f6ff']
    }}
  />
</Paper>
      </Box>

    </Stack>
  );
}
