"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Database, 
  Users, 
  MessageSquare, 
  Brain,
  ExternalLink,
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  Edit3
} from "lucide-react"

interface Session {
  id: string
  created_at: string
  updated_at: string
  status: string
  model_config: string | null
  title: string | null
  conversation_count: number
}

interface AgentMetric {
  agent_role: string
  total_queries: number
  total_score: number
  best_responses: number
  avg_response_time: number
}

interface Agent {
  id: string
  name: string
  specialization: string
  avatar: string
  color: string
  voiceType: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [metrics, setMetrics] = useState<AgentMetric[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      setRefreshing(true)
      
      // Fetch sessions
      const sessionsRes = await fetch('/api/admin/sessions')
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json()
        setSessions(sessionsData.sessions || [])
      }
      
      // Fetch metrics
      const metricsRes = await fetch('/api/admin/metrics')
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMetrics(metricsData.metrics || [])
      }
      
      // Fetch agents
      const agentsRes = await fetch('/api/admin/persona')
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json()
        setAgents(agentsData.registry || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const createNewSession = async () => {
    const id = `session-${Date.now()}`
    try {
      await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title: `Meeting ${sessions.length + 1}` })
      })
      router.push(`/admin/meeting/${id}`)
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  const viewSession = (sessionId: string) => {
    router.push(`/admin/meeting/${sessionId}`)
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return
    
    try {
      await fetch(`/api/admin/sessions?id=${sessionId}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  const totalConversations = sessions.reduce((acc, s) => acc + (s.conversation_count || 0), 0)

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-600 mt-1">Manage AI Board system and view analytics</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={fetchData}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={createNewSession}>
              <Plus className="w-4 h-4 mr-2" />
              New Meeting
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Sessions</p>
                  <p className="text-2xl font-bold">{sessions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Conversations</p>
                  <p className="text-2xl font-bold">{totalConversations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Active Agents</p>
                  <p className="text-2xl font-bold">{agents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Brain className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Queries</p>
                  <p className="text-2xl font-bold">
                    {metrics.reduce((acc, m) => acc + m.total_queries, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Sessions</CardTitle>
                <CardDescription>View and manage meeting sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No sessions found. Create a new meeting to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div 
                        key={session.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">
                              {session.title || `Session ${session.id.slice(0, 8)}`}
                            </h4>
                            <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                              {session.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500">
                            {session.conversation_count || 0} conversations • 
                            Created: {new Date(session.created_at).toLocaleString()}
                          </p>
                          {session.model_config && (
                            <p className="text-xs text-blue-600 mt-1">
                              Model: {session.model_config}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => viewSession(session.id)}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteSession(session.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Status</CardTitle>
                <CardDescription>Manage AI agents and their personas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agents.map((agent) => {
                    const metric = metrics.find(m => m.agent_role === agent.id)
                    return (
                      <Card key={agent.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{agent.avatar}</span>
                            <div className="flex-1">
                              <h4 className="font-medium">{agent.name}</h4>
                              <p className="text-sm text-slate-500">{agent.specialization}</p>
                              {metric && (
                                <div className="flex gap-2 mt-2 text-xs">
                                  <Badge variant="outline">{metric.total_queries} queries</Badge>
                                  <Badge variant="outline">{metric.best_responses} best</Badge>
                                </div>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => router.push(`/admin/persona/${agent.id}`)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure AI providers and models</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => router.push('/admin/models')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Model Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
