import React, { useState } from 'react';
import { 
  Building2, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Key, 
  Network, 
  Link2,
  Lock,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';

interface HospitalBillingIntegrationProps {
  onUploadSuccess: () => void;
}

export const HospitalBillingIntegration: React.FC<HospitalBillingIntegrationProps> = ({ onUploadSuccess }) => {
  const [sourceType, setSourceType] = useState('clinic_syndromic');
  const [apiEndpoint, setApiEndpoint] = useState('https://his.erode-district.gov.in/api/v1/syndromic/feed');
  const [authMethod, setAuthMethod] = useState('mutual_tls');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleTestConnection = () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    setConnectionError(null);

    setTimeout(() => {
      setTestingConnection(false);
      // Transparent demo response: authorized connector simulation
      setConnectionStatus("Simulated Handshake Verified: Endpoint authenticated via TLS 1.3 certificate. Telemetry pipeline ready.");
    }, 1200);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError(null);

    try {
      const res = await api.uploadCsv(selectedFile, sourceType);
      setUploadResult(res);
      onUploadSuccess();
    } catch (err: any) {
      setUploadError(err.message || 'CSV upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Hospital, LIS & Clinic Ingestion Connector
          </h2>
          <p className="text-xs text-slate-400">
            Configure external hospital information systems (HIS/LIS) or upload sanitized surveillance CSV batches.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-indigo-900/60">
          Connector Protocol: HTTPS REST / CSV
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: API Connector Config */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-blue-400" />
              API Gateway Connector Configuration
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Status: Configurable</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Target Source Category
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-xs"
              >
                <option value="clinic_syndromic">Clinic Outpatient Syndromic Summaries</option>
                <option value="diagnostic_lab">Diagnostic Laboratory Network (LIS)</option>
                <option value="pharmacy_pos">Pharmacy Retail Antipyretic Demand</option>
                <option value="school_workplace_absenteeism">Institutional Absenteeism Summaries</option>
                <option value="hospital_capacity">Hospital Resource & Bed Census</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Authorized Provider Endpoint URL
              </label>
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                placeholder="https://provider.hospital.org/api/v1/telemetry"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Authentication Protocol
                </label>
                <select
                  value={authMethod}
                  onChange={(e) => setAuthMethod(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 text-xs focus:outline-none"
                >
                  <option value="mutual_tls">Mutual TLS (mTLS Cert)</option>
                  <option value="bearer_oauth">OAuth2 / Bearer Token</option>
                  <option value="api_key">HMAC-SHA256 API Key</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  id="test-connection-btn"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  {testingConnection ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      Test Connection
                    </>
                  )}
                </button>
              </div>
            </div>

            {connectionStatus && (
              <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-[11px] text-emerald-300 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>{connectionStatus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: CSV Batch Upload */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              Batch CSV Telemetry Ingestion
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono">Server Validated</span>
          </div>

          <p className="text-xs text-slate-400">
            Upload anonymized aggregate daily counts. Direct patient identifiers (names, phone numbers, national IDs) will be rejected by the server.
          </p>

          <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-3 text-center transition-all bg-slate-900/40">
            <input
              type="file"
              id="csv-file-input"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="csv-file-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-1 text-xs text-slate-300 hover:text-white"
            >
              <FileText className="w-6 h-6 text-slate-400" />
              <span>{selectedFile ? selectedFile.name : 'Choose or drop a CSV file here'}</span>
              <span className="text-[10px] text-slate-500 font-mono">
                Mandatory schema: date, zone_id, value, signal_type
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="submit-csv-upload-btn"
              onClick={handleUploadSubmit}
              disabled={!selectedFile || uploading}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                !selectedFile || uploading
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30'
              }`}
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Validating & Ingesting...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Ingest & Validate CSV
                </>
              )}
            </button>
          </div>

          {/* Upload Success Feedback */}
          {uploadResult && (
            <div className="p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-800/80 text-xs text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Ingestion Confirmed</span>
              </div>
              <p className="text-[11px] text-emerald-200">
                {uploadResult.message}
              </p>
              <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-3 pt-1">
                <span>Records: {uploadResult.records_ingested}</span>
                <span>Small-Cell Masked: {uploadResult.small_cell_suppressed_records}</span>
              </div>
            </div>
          )}

          {/* Upload Error Feedback */}
          {uploadError && (
            <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Upload Rejected</span>
                <span className="text-[11px] text-rose-200">{uploadError}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
