import React, { useState, useEffect } from 'react';
import {
  Key, Shield, AlertTriangle, Copy, CheckCircle2, Clock,
  Eye, EyeOff, Trash2, Plus, Lock, Unlock, FileKey,
  RefreshCw, History, User, Building2, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import {
  territorialSecurityEngine,
  type RecoveryKey,
  type EmergencyToken,
} from '../../services/TerritorialSecurityEngine';

type KeyType = 'A' | 'B' | 'C';

const KEY_TYPE_CONFIG: Record<KeyType, { label: string; description: string; color: string; maxUses: number }> = {
  A: { label: 'Type A', description: 'Single-use master key', color: 'red', maxUses: 1 },
  B: { label: 'Type B', description: 'Limited recovery key (3 uses)', color: 'amber', maxUses: 3 },
  C: { label: 'Type C', description: 'Extended recovery key (5 uses)', color: 'blue', maxUses: 5 },
};

export function RecoveryCenter() {
  const { user } = useAuth();
  const { org } = useOrg();

  const [recoveryKeys, setRecoveryKeys] = useState<RecoveryKey[]>([]);
  const [emergencyTokens, setEmergencyTokens] = useState<EmergencyToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'keys' | 'tokens'>('keys');

  // Generate key modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [keyType, setKeyType] = useState<KeyType>('A');
  const [keyHint, setKeyHint] = useState('');
  const [keyUserId, setKeyUserId] = useState('');
  const [keyExpiresIn, setKeyExpiresIn] = useState(30);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Create token modal
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenReason, setTokenReason] = useState('');
  const [tokenRole, setTokenRole] = useState('org_admin');
  const [tokenExpiresIn, setTokenExpiresIn] = useState(24);
  const [tokenMaxUses, setTokenMaxUses] = useState(1);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  useEffect(() => {
    if (org) loadAll();
  }, [org]);

  const loadAll = async () => {
    if (!org) return;
    setLoading(true);
    try {
      const [keys, tokens] = await Promise.all([
        territorialSecurityEngine.getRecoveryKeys(org.id),
        territorialSecurityEngine.getEmergencyTokens(org.id),
      ]);
      setRecoveryKeys(keys);
      setEmergencyTokens(tokens);
    } catch (e) {
      console.error('Failed to load recovery data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!org || !user) return;
    try {
      const { key, plainKey } = await territorialSecurityEngine.generateRecoveryKey({
        organizationId: org.id,
        userId: keyUserId || user.id,
        keyType,
        hint: keyHint || undefined,
        expiresInDays: keyExpiresIn,
      }, user.id);
      setRecoveryKeys(prev => [key, ...prev]);
      setGeneratedKey(plainKey);
      setKeyType('A');
      setKeyHint('');
      setKeyExpiresIn(30);
    } catch (e) {
      console.error('Failed to generate key:', e);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!org || !user) return;
    if (!confirm('Are you sure you want to revoke this recovery key?')) return;
    try {
      await territorialSecurityEngine.revokeRecoveryKey(keyId, user.id, org.id);
      setRecoveryKeys(prev => prev.filter(k => k.id !== keyId));
    } catch (e) {
      console.error('Failed to revoke key:', e);
    }
  };

  const handleCreateToken = async () => {
    if (!org || !user) return;
    try {
      const { token, plainToken } = await territorialSecurityEngine.createEmergencyToken({
        organizationId: org.id,
        grantedRole: tokenRole as 'org_admin' | 'project_manager' | 'supervisor' | 'agent',
        grantedPermissions: ['*'],
        reason: tokenReason,
        expiresInHours: tokenExpiresIn,
        maxUses: tokenMaxUses,
      }, user.id);
      setEmergencyTokens(prev => [token, ...prev]);
      setGeneratedToken(plainToken);
      setTokenReason('');
      setTokenExpiresIn(24);
      setTokenMaxUses(1);
    } catch (e) {
      console.error('Failed to create token:', e);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!org || !user) return;
    if (!confirm('Are you sure you want to revoke this emergency token?')) return;
    try {
      await territorialSecurityEngine.revokeEmergencyToken(tokenId, user.id, org.id);
      setEmergencyTokens(prev => prev.map(t => t.id === tokenId ? { ...t, status: 'revoked' } : t));
    } catch (e) {
      console.error('Failed to revoke token:', e);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getKeyStatus = (key: RecoveryKey) => {
    if (key.revoked_at) return { label: 'Revoked', color: 'slate' };
    if (key.expires_at && new Date(key.expires_at) < new Date()) return { label: 'Expired', color: 'red' };
    if (key.usage_count >= key.max_uses) return { label: 'Exhausted', color: 'amber' };
    return { label: 'Active', color: 'green' };
  };

  const getTokenStatus = (token: EmergencyToken) => {
    const colors: Record<string, string> = {
      pending: 'blue',
      active: 'green',
      expired: 'red',
      revoked: 'slate',
      exhausted: 'amber',
    };
    return { label: token.status.charAt(0).toUpperCase() + token.status.slice(1), color: colors[token.status] };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Key className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Recovery Center</h1>
              <p className="text-sm text-slate-500">Manage recovery keys and emergency access tokens</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {(['keys', 'tokens'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab === 'keys' ? 'Recovery Keys' : 'Emergency Tokens'}
            </button>
          ))}
        </div>

        {activeTab === 'keys' && (
          <div className="space-y-6">
            {/* Key Types Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.keys(KEY_TYPE_CONFIG) as KeyType[]).map(type => (
                <div key={type} className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      KEY_TYPE_CONFIG[type].color === 'red' ? 'bg-red-100' :
                      KEY_TYPE_CONFIG[type].color === 'amber' ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                      <Key className={`w-4 h-4 ${
                        KEY_TYPE_CONFIG[type].color === 'red' ? 'text-red-600' :
                        KEY_TYPE_CONFIG[type].color === 'amber' ? 'text-amber-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{KEY_TYPE_CONFIG[type].label}</h3>
                      <p className="text-xs text-slate-500">{KEY_TYPE_CONFIG[type].description}</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    Max uses: <span className="font-medium">{KEY_TYPE_CONFIG[type].maxUses}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Generate Key Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowGenerateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Generate Recovery Key
              </button>
            </div>

            {/* Keys Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Hint</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Uses</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Expires</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recoveryKeys.map(key => {
                    const status = getKeyStatus(key);
                    return (
                      <tr key={key.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                            key.key_type === 'A' ? 'bg-red-100 text-red-700' :
                            key.key_type === 'B' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            <Key className="w-3 h-3" />
                            {key.key_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            status.color === 'green' ? 'bg-green-100 text-green-700' :
                            status.color === 'red' ? 'bg-red-100 text-red-700' :
                            status.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{key.hint || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {key.usage_count} / {key.max_uses}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {new Date(key.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!key.revoked_at && status.color !== 'exhausted' && (
                            <button
                              onClick={() => handleRevokeKey(key.id)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {recoveryKeys.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No recovery keys generated yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="space-y-6">
            {/* Create Token Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowTokenModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Emergency Token
              </button>
            </div>

            {/* Tokens Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Token</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Uses</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Expires</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {emergencyTokens.map(token => {
                    const status = getTokenStatus(token);
                    return (
                      <tr key={token.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-600">{token.token_prefix}...</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            status.color === 'green' ? 'bg-green-100 text-green-700' :
                            status.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                            status.color === 'red' ? 'bg-red-100 text-red-700' :
                            status.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{token.granted_role}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{token.reason}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {token.usage_count} / {token.max_uses}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(token.expires_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {token.status !== 'revoked' && token.status !== 'exhausted' && (
                            <button
                              onClick={() => handleRevokeToken(token.id)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {emergencyTokens.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No emergency tokens created yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Generate Key Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Generate Recovery Key</h3>
              <button onClick={() => { setShowGenerateModal(false); setGeneratedKey(null); }}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {generatedKey ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Key Generated Successfully</span>
                  </div>
                  <p className="text-sm text-green-700 mb-3">
                    Copy this key now. It will not be shown again.
                  </p>
                  <div className="bg-white rounded p-3 border font-mono text-sm break-all">
                    {generatedKey}
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedKey)}
                    className="mt-3 flex items-center gap-2 text-green-700 hover:text-green-800 text-sm"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy to clipboard'}
                  </button>
                </div>
                <button
                  onClick={() => { setShowGenerateModal(false); setGeneratedKey(null); }}
                  className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Key Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['A', 'B', 'C'] as KeyType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setKeyType(type)}
                        className={`p-3 rounded-lg border-2 text-center ${
                          keyType === type
                            ? type === 'A' ? 'border-red-500 bg-red-50' :
                              type === 'B' ? 'border-amber-500 bg-amber-50' :
                              'border-blue-500 bg-blue-50'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="font-semibold">{type}</div>
                        <div className="text-xs text-slate-500">{KEY_TYPE_CONFIG[type].maxUses} uses</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hint (optional)</label>
                  <input
                    type="text"
                    value={keyHint}
                    onChange={e => setKeyHint(e.target.value)}
                    placeholder="A memorable hint for the key"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expires in (days)</label>
                  <input
                    type="number"
                    value={keyExpiresIn}
                    onChange={e => setKeyExpiresIn(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleGenerateKey}
                  className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Generate Key
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create Emergency Token</h3>
              <button onClick={() => { setShowTokenModal(false); setGeneratedToken(null); }}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {generatedToken ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">Token Created Successfully</span>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    Copy this token now. It will not be shown again.
                  </p>
                  <div className="bg-white rounded p-3 border font-mono text-sm break-all">
                    {generatedToken}
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedToken)}
                    className="mt-3 flex items-center gap-2 text-blue-700 hover:text-blue-800 text-sm"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy to clipboard'}
                  </button>
                </div>
                <button
                  onClick={() => { setShowTokenModal(false); setGeneratedToken(null); }}
                  className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                  <textarea
                    value={tokenReason}
                    onChange={e => setTokenReason(e.target.value)}
                    placeholder="Emergency reason..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Granted Role</label>
                  <select
                    value={tokenRole}
                    onChange={e => setTokenRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="org_admin">Org Admin</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="agent">Agent</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Expires in (hours)</label>
                    <input
                      type="number"
                      value={tokenExpiresIn}
                      onChange={e => setTokenExpiresIn(parseInt(e.target.value) || 24)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max uses</label>
                    <input
                      type="number"
                      value={tokenMaxUses}
                      onChange={e => setTokenMaxUses(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateToken}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Emergency Token
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
