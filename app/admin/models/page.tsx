"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft, 
  Cpu, 
  Sparkles,
  Check,
  RefreshCw,
  Server
} from "lucide-react"

interface Model {
  id: string
  name: string
  description: string
}

interface ProviderData {
  models: Model[]
  baseUrl?: string
  available: boolean
  apiKey?: string
  connection?: {
    connected: boolean
    latency?: number
    error?: string
  }
}

export default function ModelConfig() {
  const router = useRouter()
  const [ollamaData, setOllamaData] = useState<ProviderData | null>(null)
  const [geminiData, setGeminiData] = useState<ProviderData | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>('ollama')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchModels()
    loadSavedConfig()
  }, [])

  const loadSavedConfig = async () => {
    try {
      const res = await fetch('/api/admin/settings?key=default_model_config')
      if (res.ok) {
        const data = await res.json()
        if (data.setting?.value) {
          const config = JSON.parse(data.setting.value)
          setSelectedProvider(config.provider || 'ollama')
          setSelectedModel(config.model || '')
        }
      }
    } catch (error) {
      console.error('Error loading saved config:', error)
    }
  }

  const fetchModels = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/models')
      if (res.ok) {
        const data = await res.json()
        setOllamaData(data.ollama)
        setGeminiData(data.gemini)
        
        // Set default selection
        if (data.ollama?.models?.length > 0) {
          setSelectedModel(data.ollama.models[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveModelConfig = async () => {
    try {
      setSaving(true)
      
      const config = {
        provider: selectedProvider,
        model: selectedModel,
        ...(selectedProvider === 'ollama' && { 
          baseUrl: ollamaData?.baseUrl || 'http://localhost:11434' 
        }),
        ...(selectedProvider === 'gemini' && { 
          apiKey: geminiData?.apiKey === 'configured' ? process.env.GEMINI_API_KEY : '' 
        })
      }
      
      // Save to system settings
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'default_model_config',
          value: JSON.stringify(config)
        })
      })
      
      alert('Model configuration saved successfully!')
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading model configurations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Model Configuration</h1>
              <p className="text-slate-600">Select AI provider and default model</p>
            </div>
          </div>
          <Button onClick={fetchModels} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Provider Selection */}
        <Tabs 
          value={selectedProvider} 
          onValueChange={setSelectedProvider}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ollama" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              Ollama (Local)
              {!ollamaData?.available && (
                <Badge variant="destructive" className="ml-2 text-xs">Offline</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="gemini" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Google Gemini
              {geminiData?.connection?.connected ? (
                <Badge variant="default" className="ml-2 text-xs bg-green-500">
                  Connected {geminiData.connection.latency ? `(${geminiData.connection.latency}ms)` : ''}
                </Badge>
              ) : !geminiData?.available ? (
                <Badge variant="destructive" className="ml-2 text-xs">No API Key</Badge>
              ) : (
                <Badge variant="destructive" className="ml-2 text-xs">
                  Disconnected {geminiData?.connection?.error ? `(${geminiData.connection.error})` : ''}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ollama" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  Ollama Models
                </CardTitle>
                <CardDescription>
                  Locally hosted AI models. Make sure Ollama is running on {ollamaData?.baseUrl || 'localhost:11434'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!ollamaData?.available ? (
                  <div className="text-center py-8 text-slate-500">
                    <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Ollama is not available. Please start Ollama server.</p>
                    <p className="text-sm mt-2">
                      Run: <code className="bg-slate-200 px-2 py-1 rounded">ollama serve</code>
                    </p>
                  </div>
                ) : (
                  <RadioGroup 
                    value={selectedModel} 
                    onValueChange={setSelectedModel}
                    className="space-y-3"
                  >
                    {ollamaData.models.map((model) => (
                      <div 
                        key={model.id}
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                          selectedModel === model.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setSelectedModel(model.id)}
                      >
                        <RadioGroupItem value={model.id} id={model.id} />
                        <div className="flex-1">
                          <Label htmlFor={model.id} className="font-medium cursor-pointer">
                            {model.name}
                          </Label>
                          <p className="text-sm text-slate-500">{model.description}</p>
                        </div>
                        {selectedModel === model.id && (
                          <Check className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gemini" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Google Gemini Models
                </CardTitle>
                <CardDescription>
                  Cloud-based AI models from Google. Requires API key in .env file.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!geminiData?.available ? (
                  <div className="text-center py-8 text-slate-500">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Gemini API key not configured.</p>
                    <p className="text-sm mt-2">
                      Add <code className="bg-slate-200 px-2 py-1 rounded">GEMINI_API_KEY</code> to your .env file
                    </p>
                  </div>
                ) : (
                  <RadioGroup 
                    value={selectedModel} 
                    onValueChange={setSelectedModel}
                    className="space-y-3"
                  >
                    {geminiData.models.map((model) => (
                      <div 
                        key={model.id}
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                          selectedModel === model.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setSelectedModel(model.id)}
                      >
                        <RadioGroupItem value={model.id} id={model.id} />
                        <div className="flex-1">
                          <Label htmlFor={model.id} className="font-medium cursor-pointer">
                            {model.name}
                          </Label>
                          <p className="text-sm text-slate-500">{model.description}</p>
                        </div>
                        {selectedModel === model.id && (
                          <Check className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Selected Configuration</h3>
                <p className="text-sm text-slate-500">
                  Provider: <Badge variant="outline">{selectedProvider}</Badge>
                  {' '}Model: <Badge variant="outline">{selectedModel || 'None'}</Badge>
                </p>
              </div>
              <Button 
                onClick={saveModelConfig}
                disabled={saving || !selectedModel}
                size="lg"
              >
                {saving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save as Default
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Each meeting session can have its own model configuration</li>
              <li>Default model is used when creating new sessions</li>
              <li>Ollama models run locally on your computer</li>
              <li>Gemini models require internet and API key</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
