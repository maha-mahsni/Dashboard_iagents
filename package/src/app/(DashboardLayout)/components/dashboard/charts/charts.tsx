'use client';
import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  useTheme,
  LinearProgress,
  Chip,
  Divider,
  Fade,
  Slide,
  Zoom,
  IconButton,
  Tooltip,
  Collapse,
  Skeleton,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import { debounce } from 'lodash';

// Icônes Material-UI
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import TimelineIcon from '@mui/icons-material/Timeline';
import ReceiptIcon from '@mui/icons-material/Receipt';
import MemoryIcon from '@mui/icons-material/Memory';
import CodeIcon from '@mui/icons-material/Code';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ListIcon from '@mui/icons-material/List';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Custom MUI Theme
const getTheme = (mode: 'light' | 'dark') =>
  createTheme({
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h4: { fontWeight: 800, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.015em' },
      body2: { fontWeight: 500, letterSpacing: '0.01em' },
      caption: { fontWeight: 400, letterSpacing: '0.02em' },
    },
    palette: {
      mode,
      primary: { main: '#1e88e5', light: '#6ab7ff', dark: '#005cb2' },
      secondary: { main: '#6ab7ff', light: '#b3e5fc', dark: '#1976d2' }, // Variante de bleu plus claire
      background: {
        default: mode === 'light' ? '#f5f7fa' : '#1a1f2e',
        paper: mode === 'light' ? '#ffffff' : '#222b40',
      },
      divider: mode === 'light' ? '#e0e6ed' : '#3a4463',
      text: {
        primary: mode === 'light' ? '#1a1f2e' : '#e0e7f3',
        secondary: mode === 'light' ? '#6b7280' : '#a0b0c0',
      },
      error: { main: '#f44336', light: '#e57373', dark: '#d32f2f' },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: '20px',
            boxShadow: mode === 'light' ? '0 10px 30px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.06)' : '0 12px 40px rgba(0,0,0,0.4)',
            background: mode === 'light' ? 'linear-gradient(135deg, #ffffff, #f0f4f8)' : 'linear-gradient(135deg, #222b40, #1a1f2e)',
            border: `1px solid ${mode === 'light' ? 'rgba(30, 136, 229, 0.2)' : 'rgba(30, 136, 229, 0.1)'}`,
            backdropFilter: 'blur(20px)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'scale(1.03)',
              boxShadow: mode === 'light' ? '0 14px 40px rgba(0,0,0,0.15)' : '0 16px 50px rgba(0,0,0,0.5)',
              borderColor: mode === 'light' ? '#1e88e5' : '#6ab7ff',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: '24px',
            fontWeight: 600,
            padding: '4px 12px',
            background: mode === 'light' ? 'linear-gradient(135deg, #e0f7fa, #b2ebf2)' : 'linear-gradient(135deg, #2a3d50, #1e2a38)',
            boxShadow: '0 2px 6px rgba(30, 136, 229, 0.2)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            padding: '10px 24px',
            boxShadow: '0 4px 12px rgba(30, 136, 229, 0.3)',
          },
        },
      },
      MuiFormControl: {
        styleOverrides: {
          root: {
            minWidth: 120,
            '& .MuiInputBase-root': {
              borderRadius: '12px',
            },
          },
        },
      },
    },
  });

interface StatData {
  executions: number;
  temps_moyen: string;
  derniere_execution: string;
  taux_succes: string;
  tokens: number;
  cout: string;
  api: string;
  etat: string;
  nom: string;
}

interface LogEntry {
  timestamp: string;
  message: string;
  duration?: number;
  success?: boolean;
  error?: string;
}

interface CourbePoint {
  time: string;
  duration: number;
}

interface PerformanceData {
  temps_reponse: number;
  courbe?: CourbePoint[];
}

interface ChartsProps {
  agentId: number;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  '&:hover': {
    transform: 'scale(1.03)',
    boxShadow: theme.palette.mode === 'light' ? '0 14px 40px rgba(0,0,0,0.15)' : '0 16px 50px rgba(0,0,0,0.5)',
    borderColor: theme.palette.primary.light,
  },
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
}));

function ChartsComponent({ agentId }: ChartsProps) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const theme = useTheme();
  const [stats, setStats] = useState<StatData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [picData, setPicData] = useState<{ heure: string; pic_utilisation: number }>({ heure: '00h', pic_utilisation: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isDataReady, setIsDataReady] = useState(false);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState({ details: true, performance: true, recentLogs: true, usage: true, allLogs: true });
  const [isRetrying, setIsRetrying] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [openAllLogsDialog, setOpenAllLogsDialog] = useState(false);
  const [openErrorDialog, setOpenErrorDialog] = useState(false);
  const [selectedErrorLog, setSelectedErrorLog] = useState<LogEntry | null>(null);

  const fetchData = useCallback(
    debounce(async () => {
      try {
        setIsRetrying(true);
        const endpoints = [
          `http://localhost:8000/stats/${agentId}`,
          `http://localhost:8000/logs/${agentId}`,
          `http://localhost:8000/performance/${agentId}`,
          `http://localhost:8000/pic-usage/${agentId}`,
        ];

        const [statsRes, logsRes, perfRes, picRes] = await Promise.all(
          endpoints.map(endpoint =>
            fetch(endpoint).then(res => {
              if (!res.ok) throw new Error(`Échec pour ${endpoint}: ${res.status} - ${res.statusText}`);
              return res.json();
            })
          )
        );

        if (!statsRes || typeof statsRes !== 'object') throw new Error('Données stats invalides');
        if (!Array.isArray(logsRes)) throw new Error('Données logs invalides');
        if (!perfRes || typeof perfRes !== 'object') throw new Error('Données performance invalides');

        const validCourbe = Array.isArray(perfRes.courbe)
          ? perfRes.courbe.filter((pt: CourbePoint) => pt?.time && typeof pt?.duration === 'number')
          : [];

        setStats(statsRes);
        setLogs(logsRes);
        setPerformance({ ...perfRes, courbe: validCourbe });
        setPicData({
          heure: picRes.heure_pic || '00h',
          pic_utilisation: picRes.utilisation || 0,
        });
        setError(null);
        setIsDataReady(true);
      } catch (error: any) {
        console.error('Erreur de fetch globale:', error);
        setError(`Échec de la récupération des données: ${error.message || 'Erreur inconnue'}`);
        setIsDataReady(false);
      } finally {
        setIsRetrying(false);
      }
    }, 300),
    [agentId]
  );

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => {
      clearInterval(interval);
      fetchData.cancel();
    };
  }, [fetchData]);

  const getLogIcon = useCallback((log: LogEntry, index: number) => {
    if (log.message.toLowerCase().includes('timeout') || log.success === false) {
      return (
        <Tooltip title="Voir les détails de l'erreur">
          <IconButton
            onClick={() => {
              setSelectedErrorLog(log);
              setOpenErrorDialog(true);
            }}
            sx={{ p: 0 }}
            aria-label={`Voir les détails de l'erreur pour le log ${index + 1}`}
          >
            <ErrorIcon fontSize="small" color="error" />
          </IconButton>
        </Tooltip>
      );
    }
    if ((log.duration ?? 0) > 3) {
      return <WarningIcon fontSize="small" color="warning" />;
    }
    return <InfoIcon fontSize="small" color="info" />;
  }, []);

  const getStatusChip = (etat: string) => {
    const etatLower = etat.toLowerCase().trim();
    if (etatLower === 'actif') {
      return (
        <Box style={{ backgroundColor: 'transparent', padding: '0px 10px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', border: '1px solid #1e88e5' }}>
          <CheckCircleIcon style={{ color: '#1e88e5', fontSize: '16px', marginRight: '4px' }} />
          <Typography style={{ color: '#1e88e5', fontWeight: 600 }}>{etat}</Typography>
        </Box>
      );
    } else if (etatLower === 'erreur') {
      return (
        <Box style={{ backgroundColor: 'transparent', padding: '0px 10px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', border: '1px solid #f44336' }}>
          <ErrorIcon style={{ color: '#f44336', fontSize: '16px', marginRight: '4px' }} />
          <Typography style={{ color: '#f44336', fontWeight: 600 }}>{etat}</Typography>
        </Box>
      );
    } else {
      return (
        <Box style={{ backgroundColor: 'transparent', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', border: '1px solid #ffffff' }}>
          <ErrorIcon style={{ color: '#ffffff', fontSize: '16px', marginRight: '4px' }} />
          <Typography style={{ color: '#ffffff', fontWeight: 600 }}>{etat}</Typography>
        </Box>
      );
    }
  };

  const formatLogMessage = useCallback((log: LogEntry, index: number) => {
    const durationStr = log.duration ? ` (${log.duration.toFixed(2)}s)` : '';
    const isExpanded = expandedLog === index;
    const msg = isExpanded ? log.message : log.message.length > 50 ? `${log.message.slice(0, 47)}...` : log.message;
    return `${msg}${durationStr}`;
  }, [expandedLog]);

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const toggleMode = useCallback(() => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const getRecentLogs = useMemo(() => {
    if (logFilter === 'all') return logs.slice(-5);
    return logs.filter(log => {
      if (logFilter === 'error') return log.message.toLowerCase().includes('timeout') || log.success === false;
      if (logFilter === 'warning') return (log.duration ?? 0) > 3;
      if (logFilter === 'info') return !log.message.toLowerCase().includes('timeout') && log.success !== false && (log.duration ?? 0) <= 3;
      return true;
    }).slice(-5);
  }, [logs, logFilter]);

  const getAllLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter(log => {
      if (logFilter === 'error') return log.message.toLowerCase().includes('timeout') || log.success === false;
      if (logFilter === 'warning') return (log.duration ?? 0) > 3;
      if (logFilter === 'info') return !log.message.toLowerCase().includes('timeout') && log.success !== false && (log.duration ?? 0) <= 3;
      return true;
    });
  }, [logs, logFilter]);

  const averageDuration = useMemo(() => {
    if (!performance?.courbe?.length) return 0;
    const sum = performance.courbe.reduce((acc, pt) => acc + pt.duration, 0);
    return sum / performance.courbe.length;
  }, [performance]);

  const chartOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        id: 'realtime',
        toolbar: { show: false, tools: { download: false, selection: true } },
        type: 'area',
        foreColor: theme.palette.text.secondary,
        fontFamily: theme.typography.fontFamily,
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 600,
          animateGradually: { enabled: true, delay: 100 },
        },
      },
      stroke: {
        curve: 'smooth',
        width: 3,
        colors: [theme.palette.primary.main],
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0.8,
          opacityFrom: 0.7,
          opacityTo: 0.2,
          stops: [0, 90, 100],
          colorStops: [
            [
              { offset: 0, color: theme.palette.primary.main, opacity: 0.7 },
              { offset: 100, color: theme.palette.primary.light, opacity: 0.2 },
            ],
          ],
        },
      },
      dataLabels: { enabled: false },
      colors: [theme.palette.primary.main],
      xaxis: {
        categories: performance?.courbe?.length
          ? performance.courbe.map((pt) => pt.time)
          : ['Aucune donnée'],
        labels: {
          style: {
            colors: theme.palette.text.secondary,
            fontFamily: theme.typography.fontFamily,
            fontSize: '13px',
            fontWeight: 500,
          },
          rotate: -45,
          offsetY: 5,
          datetimeUTC: false,
          format: 'HH:mm',
        },
        axisBorder: { show: true, color: theme.palette.divider },
        axisTicks: { show: true, color: theme.palette.divider },
      },
      yaxis: {
        title: {
          text: 'Temps de réponse (s)',
          style: {
            color: theme.palette.text.primary,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: theme.typography.fontFamily,
          },
        },
        min: 0,
        labels: {
          style: {
            colors: theme.palette.text.secondary,
            fontFamily: theme.typography.fontFamily,
            fontWeight: 500,
          },
          formatter: (value) => value.toFixed(1),
        },
      },
      grid: {
        borderColor: theme.palette.divider,
        strokeDashArray: 2,
        padding: { left: 20, right: 20, top: 10, bottom: 20 },
      },
      tooltip: {
        theme: mode,
        x: { format: 'HH:mm:ss' },
        style: {
          fontFamily: theme.typography.fontFamily,
          fontSize: '13px',
          background: mode === 'dark' ? '#1a1f2e' : '#ffffff',
          borderRadius: '8px',
        },
        marker: { show: true },
        custom: ({ series, seriesIndex, dataPointIndex }) => {
          const data = performance?.courbe?.[dataPointIndex];
          return `
            <div style="padding: 12px; border-radius: 8px; background: ${mode === 'dark' ? '#1a1f2e' : '#ffffff'}; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <strong>${data?.time || 'N/A'}</strong><br/>
              Temps: ${series[seriesIndex][dataPointIndex].toFixed(2)}s
            </div>
          `;
        },
      },
      markers: {
        size: 4,
        colors: [theme.palette.primary.main],
        strokeColors: theme.palette.background.paper,
        strokeWidth: 2,
        hover: { size: 6 },
      },
    }),
    [theme, performance, mode]
  );

  const radialChartOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'radialBar',
        foreColor: theme.palette.text.secondary,
        fontFamily: theme.typography.fontFamily,
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 600,
          animateGradually: { enabled: true, delay: 100 },
        },
      },
      plotOptions: {
        radialBar: {
          hollow: {
            size: '68%',
            margin: 12,
            background: mode === 'dark' ? '#1a1f2e' : '#f5f7fa',
            dropShadow: {
              enabled: true,
              top: 2,
              left: 2,
              blur: 4,
              opacity: 0.15,
            },
          },
          dataLabels: {
            name: {
              show: true,
              fontSize: '16px',
              fontWeight: 600,
              color: theme.palette.text.secondary,
              fontFamily: theme.typography.fontFamily,
              offsetY: -10,
            },
            value: {
              show: true,
              fontSize: '32px',
              fontWeight: 700,
              color: theme.palette.text.primary,
              fontFamily: theme.typography.fontFamily,
              offsetY: 10,
              formatter: (val) => `${val}%`,
            },
            total: {
              show: true,
              label: `Pic à ${picData.heure}`,
              fontSize: '14px',
              color: theme.palette.text.secondary,
              fontFamily: theme.typography.fontFamily,
            },
          },
          track: {
            background: mode === 'dark' ? '#2a3d50' : '#e0f7fa',
            strokeWidth: '100%',
            margin: 6,
            dropShadow: {
              enabled: true,
              top: -2,
              left: -2,
              blur: 4,
              opacity: 0.15,
            },
          },
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          shadeIntensity: 0.2,
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 0.85,
          stops: [0, 100],
          colorStops: [
            [
              { offset: 0, color: theme.palette.primary.main, opacity: 1 },
              { offset: 100, color: theme.palette.primary.light, opacity: 0.85 },
            ],
          ],
        },
      },
      colors: [theme.palette.primary.main],
      stroke: { lineCap: 'round' },
      labels: ['Utilisation'],
    }),
    [theme, picData, mode]
  );

  const handleOpenAllLogsDialog = () => {
    setOpenAllLogsDialog(true);
  };

  const handleCloseAllLogsDialog = () => {
    setOpenAllLogsDialog(false);
  };

  const handleCloseErrorDialog = () => {
    setOpenErrorDialog(false);
    setSelectedErrorLog(null);
  };

  if (error) return (
    <Fade in timeout={1000}>
      <StyledPaper sx={{
        p: 4,
        textAlign: 'center',
        bgcolor: mode === 'dark' ? '#1a1f2e' : '#fff3f3',
        borderRadius: 20,
        border: `1px solid ${theme.palette.error.main}`,
        maxWidth: 500,
        mx: 'auto',
        my: 8,
        boxShadow: '0 10px 30px rgba(244, 67, 54, 0.1), 0 4px 8px rgba(244, 67, 54, 0.06)',
        backdropFilter: 'blur(20px)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': { transform: 'scale(1.04)', boxShadow: '0 14px 40px rgba(244, 67, 54, 0.15)' },
      }}>
        <ErrorIcon color="error" sx={{ fontSize: 72, mb: 3, opacity: 0.9 }} />
        <Typography variant="h4" color="error.main" fontWeight={800} gutterBottom>
          Erreur Système
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto', lineHeight: 1.6, mb: 4 }}>
          {error}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={fetchData}
          disabled={isRetrying}
          sx={{ borderRadius: 12, textTransform: 'none', fontWeight: 600, padding: '12px 28px' }}
          aria-label="Réessayer le chargement des données"
        >
          {isRetrying ? 'Réessai en cours...' : 'Réessayer'}
        </Button>
      </StyledPaper>
    </Fade>
  );

  if (!stats || !performance || !isDataReady) return (
    <Fade in timeout={1000}>
      <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'background.default' }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 4 }} />
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr' }} gap={3}>
          {[...Array(4)].map((_, index) => (
            <StyledPaper key={index} sx={{ p: 3, borderRadius: 20, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` }}>
              <Skeleton variant="rectangular" height={40} sx={{ mb: 2, borderRadius: 4 }} />
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 4 }} />
            </StyledPaper>
          ))}
        </Box>
      </Box>
    </Fade>
  );

  return (
    <ThemeProvider theme={getTheme(mode)}>
      <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'background.default', minHeight: '100vh' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" fontWeight={800} color="text.primary" aria-label={`Tableau de bord de l'agent ${stats.nom}`}>
            Dashboard de l'Agent
          </Typography>
          <Tooltip title={mode === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}>
            <IconButton onClick={toggleMode} aria-label={mode === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'} sx={{ color: 'text.primary' }}>
              {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
            </IconButton>
          </Tooltip>
        </Box>

        <Stack spacing={4}>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr' }} gap={3}>
            <Slide in direction="up" timeout={1000}>
              <StyledPaper sx={{ p: 3, borderRadius: 20, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, backdropFilter: 'blur(20px)' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <MemoryIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h5" fontWeight={700} color="text.primary">
                      Détails de l'Agent
                    </Typography>
                  </Box>
                  <Tooltip title={expandedSections.details ? 'Réduire' : 'Agrandir'}>
                    <IconButton onClick={() => toggleSection('details')} aria-label={expandedSections.details ? 'Réduire les détails de l\'agent' : 'Agrandir les détails de l\'agent'}>
                      {expandedSections.details ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>
                <Collapse in={expandedSections.details}>
                  <Stack spacing={2}>
                    {[
                      {
                        icon: <ReceiptIcon fontSize="small" sx={{ color: '#1e88e5' }} />,
                        label: 'Exécutions',
                        value: (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Chip
                              label={stats.executions}
                              size="small"
                              sx={{ fontWeight: 600, minWidth: 80, background: 'linear-gradient(135deg, #1e88e5, #005cb2)', color: '#ffffff' }}
                            />
                            <Box
                              sx={{
                                ml: 1,
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: '#6ab7ff',
                                animation: 'pulse 1.5s infinite',
                                '@keyframes pulse': {
                                  '0%': { transform: 'scale(1)', opacity: 0.7 },
                                  '50%': { transform: 'scale(1.3)', opacity: 0.4 },
                                  '100%': { transform: 'scale(1)', opacity: 0.7 },
                                },
                              }}
                            />
                          </Box>
                        ),
                      },
                      { icon: <AccessTimeIcon fontSize="small" color="primary" />, label: 'Temps moyen', value: stats.temps_moyen },
                      { icon: <TimelineIcon fontSize="small" color="primary" />, label: 'Dernière exécution', value: stats.derniere_execution },
                      { icon: <DonutLargeIcon fontSize="small" color="primary" />, label: 'Taux de succès', value: stats.taux_succes, color: parseFloat(stats.taux_succes) > 90 ? 'secondary.main' : 'warning.main' },
                      { icon: <CodeIcon fontSize="small" color="primary" />, label: 'API utilisée', value: stats.api },
                      { icon: null, label: 'État', value: getStatusChip(stats.etat) },
                    ].map((item, index) => (
                      <Box key={index}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ py: 1.5 }}>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            {item.icon}
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                              {item.label}
                            </Typography>
                          </Box>
                          <Typography component="div" fontWeight={600} color={item.color || 'text.primary'} sx={{ fontSize: '0.95rem' }}>
                            {item.value}
                          </Typography>
                        </Box>
                        {index < 5 && <Divider sx={{ borderColor: theme.palette.divider, opacity: 0.2 }} />}
                      </Box>
                    ))}
                  </Stack>
                </Collapse>
              </StyledPaper>
            </Slide>

            <Slide in direction="up" timeout={1000}>
              <StyledPaper sx={{ p: 3, borderRadius: 20, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, backdropFilter: 'blur(20px)' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <ShowChartIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h5" fontWeight={700} color="text.primary">
                      Performance temps réel
                    </Typography>
                  </Box>
                  <Tooltip title={expandedSections.performance ? 'Réduire' : 'Agrandir'}>
                    <IconButton onClick={() => toggleSection('performance')} aria-label={expandedSections.performance ? 'Réduire le graphique de performance' : 'Agrandir le graphique de performance'}>
                      {expandedSections.performance ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>
                <Collapse in={expandedSections.performance}>
                  <Box role="region" aria-label="Graphique de performance temps réel">
                    <ReactApexChart
                      options={chartOptions}
                      series={performance?.courbe?.length
                        ? [{ name: 'Temps de réponse (s)', data: performance.courbe.map(pt => pt.duration) }]
                        : [{ name: 'Aucune donnée', data: [0] }]}
                      type="area"
                      height={340}
                    />
                  </Box>
                </Collapse>
              </StyledPaper>
            </Slide>
          </Box>

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr' }} gap={3}>
            <Slide in direction="up" timeout={1000}>
              <StyledPaper sx={{ p: 3, borderRadius: 20, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, backdropFilter: 'blur(20px)' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <HistoryIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h5" fontWeight={700} color="text.primary">
                      Logs récents
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <FormControl size="small">
                      <InputLabel id="log-filter-label">Filtrer</InputLabel>
                      <Select
                        labelId="log-filter-label"
                        value={logFilter}
                        label="Filtrer"
                        onChange={(e) => setLogFilter(e.target.value as typeof logFilter)}
                        sx={{ borderRadius: 12, bgcolor: theme.palette.background.paper }}
                        aria-label="Filtrer les logs récents"
                      >
                        <MenuItem value="all">Tous</MenuItem>
                        <MenuItem value="error">Erreurs</MenuItem>
                        <MenuItem value="warning">Alertes</MenuItem>
                        <MenuItem value="info">Infos</MenuItem>
                      </Select>
                    </FormControl>
                    <Tooltip title={expandedSections.recentLogs ? 'Réduire' : 'Agrandir'}>
                      <IconButton onClick={() => toggleSection('recentLogs')} aria-label={expandedSections.recentLogs ? 'Réduire les logs récents' : 'Agrandir les logs récents'}>
                        {expandedSections.recentLogs ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Collapse in={expandedSections.recentLogs}>
                  <Box sx={{
                    bgcolor: mode === 'dark' ? '#1a1f2e' : '#f5f7fa',
                    borderRadius: 8,
                    p: 2,
                    border: `1px solid ${theme.palette.divider}`,
                  }}>
                    <Stack spacing={1.5} role="log" aria-label="Liste des logs récents">
                      {getRecentLogs.length > 0 ? getRecentLogs.map((log, index) => (
                        <Fade in key={index} timeout={1000 + index * 100}>
                          <Box
                            display="flex"
                            gap={2}
                            alignItems="center"
                            sx={{
                              p: 1.5,
                              borderRadius: 8,
                              bgcolor: 'background.paper',
                              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                              '&:hover': { bgcolor: theme.palette.action.hover, transform: 'translateX(6px)' },
                            }}
                          >
                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70, fontWeight: 500 }}>
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                            <Box sx={{ width: 24 }}>{getLogIcon(log, index)}</Box>
                            <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500, lineHeight: 1.5 }}>
                              {formatLogMessage(log, index)}
                            </Typography>
                            {log.message.length > 50 && (
                              <Tooltip title={expandedLog === index ? 'Réduire' : 'Agrandir'}>
                                <IconButton
                                  size="small"
                                  onClick={() => setExpandedLog(expandedLog === index ? null : index)}
                                  sx={{ ml: 'auto', color: theme.palette.text.secondary }}
                                  aria-label={expandedLog === index ? `Réduire le log ${index + 1}` : `Agrandir le log ${index + 1}`}
                                >
                                  <ExpandMoreIcon
                                    sx={{
                                      transform: expandedLog === index ? 'rotate(180deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.3s ease',
                                    }}
                                  />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Fade>
                      )) : (
                        <Typography variant="body2" color="text.secondary" textAlign="center" py={2} fontWeight={500}>
                          Aucun log disponible
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Collapse>
              </StyledPaper>
            </Slide>

            <Slide in direction="up" timeout={1000}>
              <StyledPaper sx={{ p: 3, borderRadius: 20, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, backdropFilter: 'blur(20px)' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <EqualizerIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h5" fontWeight={700} color="text.primary">
                      Pic d'utilisation
                    </Typography>
                  </Box>
                  <Tooltip title={expandedSections.usage ? 'Réduire' : 'Agrandir'}>
                    <IconButton onClick={() => toggleSection('usage')} aria-label={expandedSections.usage ? 'Réduire le graphique d\'utilisation' : 'Agrandir le graphique d\'utilisation'}>
                      {expandedSections.usage ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>
                <Collapse in={expandedSections.usage}>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }} role="region" aria-label="Graphique de pic d'utilisation">
                    {typeof picData.pic_utilisation === 'number' ? (
                      <ReactApexChart
                        type="radialBar"
                        height={360}
                        series={[picData.pic_utilisation]}
                        options={radialChartOptions}
                      />
                    ) : (
                      <Typography color="error" fontWeight={500}>Erreur: données d'utilisation invalides</Typography>
                    )}
                  </Box>
                  <Box sx={{ mt: 3 }}>
                    <StyledPaper sx={{
                      p: 2,
                      borderRadius: 8,
                      bgcolor: mode === 'dark' ? '#1a1f2e' : '#e0f7fa',
                      border: `1px solid ${theme.palette.divider}`,
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.1)' },
                    }}>
                      <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
                        Consommation des ressources
                      </Typography>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2" fontWeight={500}>Tokens utilisés</Typography>
                        <Typography fontWeight={600}>{stats.tokens}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={500}>Coût estimé</Typography>
                        <Typography fontWeight={600}>{stats.cout}</Typography>
                      </Box>
                    </StyledPaper>
                  </Box>
                </Collapse>
              </StyledPaper>
            </Slide>
          </Box>

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr', lg: '1fr' }} gap={3}>
            <Slide in direction="up" timeout={1000}>
              <StyledPaper sx={{ p: 3, borderRadius: 20, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, backdropFilter: 'blur(20px)' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <ListIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h5" fontWeight={700} color="text.primary">
                      Tous les Logs
                    </Typography>
                  </Box>
                  <Tooltip title="Afficher tous les logs">
                    <IconButton onClick={handleOpenAllLogsDialog} aria-label="Afficher tous les logs">
                      <ExpandMoreIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Collapse in={expandedSections.allLogs}>
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                    Cliquez pour voir l'historique complet des logs.
                  </Typography>
                </Collapse>
              </StyledPaper>
            </Slide>
          </Box>
        </Stack>

        <Dialog
          open={openAllLogsDialog}
          onClose={handleCloseAllLogsDialog}
          maxWidth="md"
          fullWidth
          aria-labelledby="all-logs-dialog-title"
        >
          <DialogTitle id="all-logs-dialog-title">
            <Box display="flex" alignItems="center" gap={2}>
              <HistoryIcon color="primary" />
              <Typography variant="h5" fontWeight={700}>Historique Complet des Logs</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{
              bgcolor: mode === 'dark' ? '#1a1f2e' : '#f5f7fa',
              borderRadius: 8,
              p: 2,
              border: `1px solid ${theme.palette.divider}`,
              maxHeight: '60vh',
              overflowY: 'auto',
            }}>
              <Stack spacing={1.5} role="log" aria-label="Liste de tous les logs">
                {getAllLogs.length > 0 ? getAllLogs.map((log, index) => (
                  <Fade in key={index} timeout={1000 + index * 100}>
                    <Box
                      display="flex"
                      gap={2}
                      alignItems="center"
                      sx={{
                        p: 1.5,
                        borderRadius: 8,
                        bgcolor: 'background.paper',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': { bgcolor: theme.palette.action.hover, transform: 'translateX(6px)' },
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70, fontWeight: 500 }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                      <Box sx={{ width: 24 }}>{getLogIcon(log, index)}</Box>
                      <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500, lineHeight: 1.5 }}>
                        {formatLogMessage(log, index)}
                      </Typography>
                      {log.message.length > 50 && (
                        <Tooltip title={expandedLog === index ? 'Réduire' : 'Agrandir'}>
                          <IconButton
                            size="small"
                            onClick={() => setExpandedLog(expandedLog === index ? null : index)}
                            sx={{ ml: 'auto', color: theme.palette.text.secondary }}
                            aria-label={expandedLog === index ? `Réduire le log ${index + 1}` : `Agrandir le log ${index + 1}`}
                          >
                            <ExpandMoreIcon
                              sx={{
                                transform: expandedLog === index ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s ease',
                              }}
                            />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Fade>
                )) : (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={2} fontWeight={500}>
                    Aucun log disponible
                  </Typography>
                )}
              </Stack>
            </Box>
          </DialogContent>
        </Dialog>

        <Dialog
          open={openErrorDialog}
          onClose={handleCloseErrorDialog}
          maxWidth="sm"
          fullWidth
          aria-labelledby="error-dialog-title"
          TransitionComponent={Zoom}
          TransitionProps={{ timeout: 500 }}
          PaperProps={{
            sx: {
              maxWidth: '680px',
              margin: 'auto',
              borderRadius: '24px',
              boxShadow: '0 16px 50px rgba(244, 67, 54, 0.2), 0 8px 20px rgba(244, 67, 54, 0.1)',
              background: mode === 'dark' ? 'linear-gradient(135deg, #222b40, #1a1f2e)' : 'linear-gradient(135deg, #ffffff, #f0f4f8)',
              backdropFilter: 'blur(25px)',
              border: mode === 'dark' ? '1px solid rgba(244, 67, 54, 0.2)' : '1px solid rgba(244, 67, 54, 0.1)',
              transition: 'transform 0.5s ease, box-shadow 0.5s ease',
              '&:hover': {
                transform: 'scale(1.04)',
                boxShadow: '0 20px 60px rgba(244, 67, 54, 0.25), 0 10px 25px rgba(244, 67, 54, 0.15)',
              },
            },
          }}
        >
          <DialogTitle id="error-dialog-title" sx={{ p: 4, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                background: mode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.05)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: 'inset 0 4px 8px rgba(0, 0, 0, 0.1)',
                transition: 'background 0.3s ease',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${theme.palette.error.light}, ${theme.palette.error.dark})`,
                  boxShadow: '0 6px 16px rgba(244, 67, 54, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.3)',
                  color: '#fff',
                  animation: 'neonPulse 2s infinite',
                  '@keyframes neonPulse': {
                    '0%': { boxShadow: '0 0 5px #f44336, 0 0 10px #f44336, 0 0 15px #e57373, inset 0 0 5px #fff' },
                    '50%': { boxShadow: '0 0 10px #f44336, 0 0 20px #f44336, 0 0 25px #e57373, inset 0 0 10px #fff' },
                    '100%': { boxShadow: '0 0 5px #f44336, 0 0 10px #f44336, 0 0 15px #e57373, inset 0 0 5px #fff' },
                  },
                }}
              >
                <ErrorIcon sx={{ fontSize: 32 }} />
              </Box>
              <Typography
                variant="h4"
                fontWeight={900}
                color={theme.palette.error.main}
                sx={{
                  letterSpacing: '1px',
                  textShadow: '0 2px 4px rgba(244, 67, 54, 0.3)',
                  lineHeight: 1.2,
                }}
              >
                Alerte Critique
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {selectedErrorLog ? (
              <Stack spacing={3}>
                <Box
                  sx={{
                    background: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08), inset 0 2px 4px rgba(244, 67, 54, 0.1)',
                    borderLeft: `8px solid ${theme.palette.error.main}`,
                  }}
                >
                  <Typography variant="h6" sx={{ fontSize: '18px', color: theme.palette.text.primary, mb: 2, fontWeight: 700 }}>
                    Incident détecté
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontSize: '15px', color: theme.palette.text.secondary, mb: 1, fontWeight: 500 }}
                  >
                    Détails de l'erreur :
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 1, color: theme.palette.text.primary }}>
                    Message : {selectedErrorLog.message}
                  </Typography>
                  {selectedErrorLog.error && (
                    <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.error.main }}>
                      Cause : {selectedErrorLog.error}
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{
                    background: mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f9fafb',
                    borderRadius: '12px',
                    padding: '20px',
                    borderLeft: `6px solid ${theme.palette.primary.main}`,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '14px',
                      color: theme.palette.text.secondary,
                      fontWeight: 500,
                    }}
                  >
                    Timestamp :{' '}
                    <strong>
                      {new Date(selectedErrorLog.timestamp).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZone: 'CET',
                      })}
                      {' (09:44 AM CET)'}
                    </strong>
                  </Typography>
                </Box>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 500 }}>
                Aucune donnée d'erreur disponible.
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 4, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Button
              onClick={handleCloseErrorDialog}
              color="primary"
              variant="contained"
              sx={{
                borderRadius: '24px',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: 700,
                textTransform: 'none',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                boxShadow: '0 6px 16px rgba(30, 136, 229, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                  boxShadow: '0 8px 20px rgba(30, 136, 229, 0.5), inset 0 3px 6px rgba(255, 255, 255, 0.4)',
                  transform: 'translateY(-2px)',
                },
                '&:active': {
                  transform: 'translateY(1px)',
                  boxShadow: '0 4px 12px rgba(30, 136, 229, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              Fermer
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default memo(ChartsComponent);