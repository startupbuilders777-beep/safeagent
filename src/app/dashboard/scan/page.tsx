"use client"

import { useState } from "react"

interface ScanResult {
  safe: boolean
  checks: {
    jailbreak?: {
      detected: boolean
      score: number
      severity: string
    }
    pii?: {
      detected: boolean
      count: number
      types: string[]
    }
  }
  summary: string
}

interface ScanHistoryItem {
  id: string
  content: string
  safe: boolean
  jailbreakDetected: boolean
  jailbreakScore: number | null
  piiDetected: boolean
  piiCount: number
  summary: string | null
  createdAt: string
}

export default function ScanPage() {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [history, setHistory] = useState<ScanHistoryItem[]>([])
  const [activeTab, setActiveTab] = useState<"scan" | "history">("scan")

  const handleScan = async () => {
    if (!content.trim()) return

    setLoading(true)
    try {
      const res = await fetch("/api/v1/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": (document.querySelector('input[name="apiKey"]') as HTMLInputElement)?.value || "sk_sa_demo",
        },
        body: JSON.stringify({ content }),
      })

      const data = await res.json()
      setResult(data)

      // Save to history
      if (res.ok) {
        await fetch("/api/v1/scan-history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": (document.querySelector('input[name="apiKey"]') as HTMLInputElement)?.value || "sk_sa_demo",
          },
          body: JSON.stringify({
            content: content.substring(0, 500), // Store truncated content
            safe: data.safe,
            jailbreakDetected: data.checks?.jailbreak?.detected || false,
            jailbreakScore: data.checks?.jailbreak?.score || null,
            piiDetected: data.checks?.pii?.detected || false,
            piiCount: data.checks?.pii?.count || 0,
            piiTypes: data.checks?.pii?.types || [],
            summary: data.summary,
          }),
        })
        fetchHistory()
      }
    } catch (error) {
      console.error("Scan error:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/v1/scan-history?limit=20")
      const data = await res.json()
      if (res.ok) {
        setHistory(data.scans)
      }
    } catch (error) {
      console.error("History fetch error:", error)
    }
  }

  // Load history on mount
  if (typeof window !== "undefined") {
    fetchHistory()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">SafeAgent Scanning Dashboard</h1>

        {/* API Key Input (for demo) */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <label className="block text-sm font-medium mb-2">API Key</label>
          <input
            type="password"
            name="apiKey"
            defaultValue="sk_sa_demo"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
            placeholder="Enter your API key"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("scan")}
            className={`px-4 py-2 rounded-lg ${
              activeTab === "scan"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            New Scan
          </button>
          <button
            onClick={() => {
              setActiveTab("history")
              fetchHistory()
            }}
            className={`px-4 py-2 rounded-lg ${
              activeTab === "history"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Scan History
          </button>
        </div>

        {activeTab === "scan" && (
          <div className="space-y-6">
            {/* Scan Input */}
            <div className="bg-gray-800 rounded-lg p-6">
              <label className="block text-lg font-medium mb-3">
                Content to Scan
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-48 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Enter text, code, or content to scan for jailbreak attempts and PII..."
              />
              <button
                onClick={handleScan}
                disabled={loading || !content.trim()}
                className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {loading ? "Scanning..." : "Run Scan"}
              </button>
            </div>

            {/* Results */}
            {result && (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span
                    className={`text-2xl font-bold ${
                      result.safe ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {result.safe ? "✓ SAFE" : "⚠ UNSAFE"}
                  </span>
                </div>

                {/* Jailbreak Detection */}
                {result.checks?.jailbreak && (
                  <div className="mb-4 p-4 bg-gray-700 rounded-lg">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          result.checks.jailbreak.detected
                            ? "bg-red-500"
                            : "bg-green-500"
                        }`}
                      />
                      Jailbreak Detection
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Detected:</span>{" "}
                        {result.checks.jailbreak.detected ? "Yes" : "No"}
                      </div>
                      <div>
                        <span className="text-gray-400">Confidence:</span>{" "}
                        {(result.checks.jailbreak.score * 100).toFixed(1)}%
                      </div>
                      <div>
                        <span className="text-gray-400">Severity:</span>{" "}
                        {result.checks.jailbreak.severity}
                      </div>
                    </div>
                  </div>
                )}

                {/* PII Detection */}
                {result.checks?.pii && (
                  <div className="mb-4 p-4 bg-gray-700 rounded-lg">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          result.checks.pii.detected ? "bg-red-500" : "bg-green-500"
                        }`}
                      />
                      PII Detection
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Detected:</span>{" "}
                        {result.checks.pii.detected ? "Yes" : "No"}
                      </div>
                      <div>
                        <span className="text-gray-400">Count:</span>{" "}
                        {result.checks.pii.count}
                      </div>
                      {result.checks.pii.types?.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-gray-400">Types:</span>{" "}
                          {result.checks.pii.types.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h3 className="font-medium mb-2">Summary</h3>
                  <p className="text-gray-300">{result.summary}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Scan History</h2>
            {history.length === 0 ? (
              <p className="text-gray-400">No scan history yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map((scan) => (
                  <div
                    key={scan.id}
                    className="p-4 bg-gray-700 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            scan.safe ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <span className="font-medium">
                          {scan.safe ? "Safe" : "Unsafe"}
                        </span>
                        {scan.jailbreakDetected && (
                          <span className="text-xs px-2 py-0.5 bg-red-900 text-red-300 rounded">
                            Jailbreak
                          </span>
                        )}
                        {scan.piiDetected && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-900 text-yellow-300 rounded">
                            PII ({scan.piiCount})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate max-w-md">
                        {scan.content}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {new Date(scan.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
