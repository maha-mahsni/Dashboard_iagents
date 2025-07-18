'use client'

import { useEffect, useState } from 'react'
import {
  Box, TextField, MenuItem, Button, FormControl,
  FormLabel, Radio, RadioGroup, FormControlLabel,
  Table, TableHead, TableRow, TableCell, TableBody, Chip,
  IconButton,
} from '@mui/material'
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'

interface Agent {
  id: number
  name: string
  type: string
  language: string
  version: string
  createdAt: string
  status: string
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [form, setForm] = useState({
    name: '',
    type: '',
    language: '',
    version: '',
    createdAt: '',
    status: 'actif'
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'tous' | 'actif' | 'inactif'>('tous')
  const filteredAgents = agents.filter(agent =>
    filter === 'tous' ? true : agent.status === filter
  )
  const fetchAgents = async () => {
    try {
      const res = await fetch('/api')
      const data = await res.json()
      setAgents(data)
    } catch (error) {
      console.error('Erreur API:', error)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name || !form.type || !form.language || !form.version || !form.createdAt) {
      toast.error("Veuillez remplir tous les champs obligatoires !")
      return
    }

    try {
      const res = await fetch('/api', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { ...form, id: editingId } : form)
      })

      if (!res.ok) {
        toast.error(isEditing ? "Erreur lors de la mise à jour" : "Erreur lors de l’ajout")
        return
      }

      toast.success(isEditing ? "Agent mis à jour ✅" : "Agent ajouté 🎉")

      setForm({
        name: '',
        type: '',
        language: '',
        version: '',
        createdAt: '',
        status: 'actif'
      })
      setIsEditing(false)
      setEditingId(null)
      fetchAgents()
    } catch (error) {
      toast.error("Erreur serveur")
    }
  }

  const handleDelete = (id: number) => {
  toast.info(
    ({ closeToast }) => (
      <Box>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          🛑 Voulez Supprimer l’agent sur 🛑 
        </div>
        <Box display="flex" gap={1} mt={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              closeToast?.()
            }}
          >
          Annuler
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={async () => {
              closeToast?.()
              try {
                const res = await fetch('/api', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id })
                })

                if (!res.ok) {
                  toast.error("❌ Erreur lors de la suppression")
                  return
                }

                toast.success("✅ Agent supprimé avec succès")
                fetchAgents()
              } catch {
                toast.error("Erreur serveur")
              }
            }}
          >
            Supprimer
          </Button>
        </Box>
      </Box>
    ),
    {
      position: 'top-right',
      autoClose: false,
      closeOnClick: false,
      draggable: false,
      closeButton: false
    }
  )
}


  const handleEdit = (agent: Agent) => {
  setForm({
    name: agent.name,
    type: agent.type,
    language: agent.language,
    version: agent.version,
    // 🔥 Ceci convertit la date en "YYYY-MM-DD"
    createdAt: new Date(agent.createdAt).toISOString().split('T')[0],
    status: agent.status,
  })
  setIsEditing(true)
    setEditingId(agent.id)
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Box
        sx={{
          display: 'grid',
          gap: 4,
          padding: 4,
          gridTemplateColumns: {
            xs: '1fr',
            md: '30% 72%'
          },
          alignItems: 'start'
        }}
      >
        <Box
          sx={{
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
            borderRadius: '12px',
            width: '100%'
          }}
        >
          <DashboardCard title="➕ Ajouter un agent IA">
            <form onSubmit={handleSubmit}>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField name="name" label="👤 Nom de l'agent" value={form.name} onChange={handleChange} fullWidth />
                <TextField name="type" label="🧠 Type d'IA" value={form.type} onChange={handleChange} select fullWidth>
                  <MenuItem value="">Sélectionnez un type</MenuItem>
                  <MenuItem value="Chatbot">Chatbot</MenuItem>
                  <MenuItem value="Assistant">Assistant</MenuItem>
                  <MenuItem value="Vision">Vision</MenuItem>
                  <MenuItem value="Traducteur">Traducteur</MenuItem>
                </TextField>
<TextField
name="createdAt"
  label="📅 Date de création"
  type="date"
  InputLabelProps={{ shrink: true }}
  value={form.createdAt}
  onChange={handleChange}
  inputProps={{
    max: new Date().toISOString().split('T')[0] // ✅ Limite max = aujourd’hui
  }}
  fullWidth
/>
                <TextField name="language" label="🌐 Langage supporté" value={form.language} onChange={handleChange} select fullWidth>
                  <MenuItem value="">Sélectionnez un langage</MenuItem>
                  <MenuItem value="Français">Français</MenuItem>
                  <MenuItem value="Anglais">Anglais</MenuItem>
                  <MenuItem value="Multilingue">Multilingue</MenuItem>
                </TextField>
                <TextField name="version" label="⚡ Version" placeholder="Ex: 1.0.0" value={form.version} onChange={handleChange} fullWidth />
                <FormControl component="fieldset">
                  <FormLabel>✅ Statut initial</FormLabel>
                  <RadioGroup row name="status" value={form.status} onChange={handleChange}>
                    <FormControlLabel value="actif" control={<Radio />} label="Actif" />
                    <FormControlLabel value="inactif" control={<Radio />} label="Inactif" />
                  </RadioGroup>
                </FormControl>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  sx={{
                    borderRadius: '9999px',
                    px: 3,
                    py: 1.2,
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    background: 'linear-gradient(to right, rgb(22,25,235), rgb(92,133,246))',
                    textTransform: 'none',
                    transition: '0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(to right, rgb(43,133,236), #6366f1)',
                      transform: 'scale(1.03)'
                    }
                  }}
                >
                  {isEditing ? "Mettre à jour" : "Créer l’Agent"}
                </Button>
              </Box>
            </form>
          </DashboardCard>
        </Box>

        <Box
          sx={{
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
            borderRadius: '12px',
            width: '100%'
          }}
        >
          <DashboardCard title="📋 Liste des agents IA">
            <Box sx={{ overflowX: 'auto' }}>
                <TextField
                select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'tous' | 'actif' | 'inactif')}
                sx={{ mb: 1, width: 195 }}
                  size="small"

                
              >
                <MenuItem value="tous"> tous est Affiché</MenuItem>
                <MenuItem value="actif">Statut:Actif</MenuItem>
                <MenuItem value="inactif">Statut:Inactif</MenuItem>
              </TextField>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>🧠 Nom</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>🤖 Type d'IA</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>📅 Date création</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>🌐 Langage</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>🛠️ Version</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>📌 Statut</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>🧾 Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAgents.map((agent)=> (
                    <TableRow key={agent.id} hover>
                      <TableCell>{agent.name}</TableCell>
                      <TableCell>{agent.type}</TableCell>
                      <TableCell>{new Date(agent.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{agent.language}</TableCell>
                      <TableCell>{agent.version}</TableCell>
                      <TableCell>
                        <Chip
                          label={agent.status.toUpperCase()}
                          size="small"
                          sx={{
                            borderRadius: '9999px',
                            px: 1.5,
                            fontWeight: 'bold',
                            backgroundColor: agent.status === 'actif' ? '#2ee7b6' : '#fd8369',
                            color: '#fff'
                          }}
                        />
                      </TableCell>
 <TableCell>
  <Box display="flex" alignItems="center" gap={1}>
    <IconButton
      onClick={() => handleEdit(agent)}
      sx={{
        borderRadius: '50%',
        color: '#0f172a',
        border: '1.5px solid #0f172a',
        width: 32,
        height: 32,
        '&:hover': {
          backgroundColor: '#f1f5f9'
        }
      }}
    >
      <EditOutlinedIcon fontSize="small" />
    </IconButton>

    <IconButton
      onClick={() => handleDelete(agent.id)}
      sx={{
        borderRadius: '50%',
        color: '#f97316',
        border: '1.5px solid #f97316',
        width: 32,
        height: 32,
        '&:hover': {
          backgroundColor: '#fff0e0',
          color: '#ea580c',
          borderColor: '#ea580c'
        }
      }}
    >
      <DeleteOutlineIcon fontSize="small" />
    </IconButton>
  </Box>
</TableCell>

                    </TableRow>
                  ))}
                  {agents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                        Aucun agent enregistré
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </DashboardCard>
        </Box>
      </Box>
    </>
  )
}
