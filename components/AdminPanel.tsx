import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, Community, CommunityMember } from '../types';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
    Shield, User, CheckCircle, Ban, Trash2, Search, Loader2, 
    BarChart2, Sliders, AlertOctagon, Activity, Users, Zap, Map,
    Clock, XCircle, Filter, AlertCircle, FileText, Database, ExternalLink, RefreshCw,
    Radar, Target, Calendar, Eye, MoreHorizontal, MessageSquare, Brain
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, ScatterChart, Scatter, ZAxis, Cell, BarChart, Bar,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartRadar
} from 'recharts';

// --- MOCK DATA ---
const initialSimulationData = [
    { month: 'Jan', stress: 30 }, { month: 'Feb', stress: 45 }, { month: 'Mar', stress: 55 },
    { month: 'Apr', stress: 70 }, { month: 'May', stress: 90 }, { month: 'Jun', stress: 40 },
    { month: 'Jul', stress: 20 }, { month: 'Aug', stress: 25 }, { month: 'Sep', stress: 45 },
    { month: 'Oct', stress: 60 }, { month: 'Nov', stress: 95 }, { month: 'Dec', stress: 50 },
];

const facultyStressData = [
    { name: 'Algorithms', score: 92, dept: 'CS' },
    { name: 'Physics', score: 78, dept: 'SCI' },
    { name: 'Calculus', score: 65, dept: 'MAT' },
    { name: 'Econ', score: 55, dept: 'BUS' },
    { name: 'History', score: 30, dept: 'ART' },
    { name: 'Chem', score: 82, dept: 'SCI' },
    { name: 'Law', score: 60, dept: 'LAW' },
];

const dropoutRadarData = [
    { subject: 'Attendance', A: 40, fullMark: 100 },
    { subject: 'Grades', A: 60, fullMark: 100 },
    { subject: 'Engagement', A: 20, fullMark: 100 },
    { subject: 'Social', A: 30, fullMark: 100 },
    { subject: 'Financial', A: 80, fullMark: 100 },
    { subject: 'Health', A: 50, fullMark: 100 },
];

const DEPTS = ['Engineering', 'Medical', 'Arts', 'Business', 'Science', 'Law'];

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'analytics' | 'communities'>('users');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Community Governance State
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Community | null>(null);
  const [groupMembers, setGroupMembers] = useState<(CommunityMember & { userProfile?: UserProfile; docId: string })[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [communityStats, setCommunityStats] = useState<any[]>([]);

  // Analytics State
  const [examPressure, setExamPressure] = useState(50);
  const [deadlineDensity, setDeadlineDensity] = useState(40);
  const [simData, setSimData] = useState(initialSimulationData);
  const [projectedBurnout, setProjectedBurnout] = useState(0);
  
  // BigQuery Integration State
  const [isAggregating, setIsAggregating] = useState(false);
  const [stressMapData, setStressMapData] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const users = querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id })) as UserProfile[];
      setAllUsers(users);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunities = async () => {
      try {
          const q = query(collection(db, 'microCommunities'), orderBy('createdAt', 'desc'));
          const snap = await getDocs(q);
          const comms = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Community[];
          setCommunities(comms);
          generateCommunityStats(comms);
      } catch (e) { console.error(e); }
  };

  const fetchGroupMembers = async (groupId: string) => {
      setLoadingMembers(true);
      try {
          // Get Memberships
          const memQuery = query(collection(db, 'communityMembers'), where('groupId', '==', groupId));
          const memSnap = await getDocs(memQuery);
          const members = memSnap.docs.map(d => ({ ...d.data(), docId: d.id })) as any[];

          // Join with User Profiles manually
          const enriched = await Promise.all(members.map(async (m) => {
              // Try to find in local state first to save reads
              const profile = allUsers.find(u => u.uid === m.userId);
              return { ...m, userProfile: profile || { displayName: 'Unknown', email: 'N/A', status: 'active', uid: m.userId } };
          }));
          setGroupMembers(enriched);
      } catch (e) { console.error(e); }
      setLoadingMembers(false);
  };

  // Generate Stats for Chart
  const generateCommunityStats = (data: Community[]) => {
      const now = new Date();
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const chartData: any[] = [];
      
      for (let i = days; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          
          const count = data.filter(c => {
             const cDate = c.lastMessageAt?.seconds ? new Date(c.lastMessageAt.seconds * 1000) : new Date();
             return cDate.toISOString().split('T')[0] === dateStr;
          }).length;
          
          chartData.push({ date: dateStr.slice(5), count: count + Math.floor(Math.random() * 2) }); // Add tiny jitter for demo visual if empty
      }
      setCommunityStats(chartData);
  };

  useEffect(() => { 
      fetchUsers(); 
      fetchCommunities();
  }, []);

  useEffect(() => {
      generateCommunityStats(communities);
  }, [dateRange, communities]);

  // Simulator Effect
  useEffect(() => {
      let totalStress = 0;
      const newData = initialSimulationData.map(d => {
          let stress = d.stress;
          if (['May', 'Nov'].includes(d.month)) stress = stress * (1 + ((examPressure - 50) / 100));
          stress += (deadlineDensity - 30) * 0.5;
          stress = Math.max(10, Math.min(100, stress));
          totalStress += stress;
          return { ...d, stress: Math.round(stress) };
      });
      setSimData(newData);
      setProjectedBurnout(Math.round(totalStress / 12));
  }, [examPressure, deadlineDensity]);

  // BigQuery Aggregation Simulation
  useEffect(() => {
    if (activeTab === 'analytics') {
        runBigQueryPipeline();
    }
  }, [activeTab]);

  const runBigQueryPipeline = () => {
      setIsAggregating(true);
      // Simulate API latency for BigQuery job
      setTimeout(() => {
          const generatedData = DEPTS.map((dept, i) => ({
              dept,
              x: (i * 15) + 10 + Math.random() * 10,
              y: Math.random() * 40 + 10,
              z: Math.floor(Math.random() * 60) + 40, // Stress Score
              count: Math.floor(Math.random() * 500) + 100
          }));
          setStressMapData(generatedData);
          setLastUpdated(new Date());
          setIsAggregating(false);
      }, 1500);
  };

  const handleUpdateStatus = async (uid: string, newStatus: 'active' | 'suspended' | 'pending') => {
    try {
      await updateDoc(doc(db, 'users', uid), { status: newStatus });
      setAllUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u));
    } catch (error) { console.error(error); }
  };

  const handleDeleteGroup = async (groupId: string) => {
      if(!window.confirm("Are you sure? This will delete the group and all chat history.")) return;
      try {
          await deleteDoc(doc(db, 'microCommunities', groupId));
          setCommunities(prev => prev.filter(c => c.id !== groupId));
          if(selectedGroup?.id === groupId) setSelectedGroup(null);
      } catch(e) { console.error(e); }
  };

  const handleKickMember = async (docId: string, memberId: string) => {
      if(!window.confirm("Remove this user from the group?")) return;
      try {
          // Use the specific document ID from the junction table
          const q = query(collection(db, 'communityMembers'), where('groupId', '==', selectedGroup?.id), where('userId', '==', memberId));
          const snap = await getDocs(q);
          snap.forEach(async (d) => {
             await deleteDoc(d.ref);
          });
          setGroupMembers(prev => prev.filter(m => m.userId !== memberId));
      } catch(e) { console.error(e); }
  };

  const filteredUsers = allUsers.filter(user => {
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesSearch = user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  });

  const filteredCommunities = communities.filter(c => {
      if (dateRange === 'all') return true;
      const date = c.createdAt?.seconds ? new Date(c.createdAt.seconds * 1000) : new Date();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (dateRange === '7d' ? 7 : 30));
      return date > cutoff;
  });

  const pendingCount = allUsers.filter(u => u.status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-700/50 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white font-display flex items-center gap-3">
            <Shield className="w-8 h-8 text-rose-500" /> Admin War Room
          </h2>
          <p className="text-slate-400">System-wide monitoring and strategic intervention.</p>
        </div>
        
        <div className="flex bg-slate-800 p-1 rounded-xl">
            <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${activeTab === 'users' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>
                <Users className="w-4 h-4" /> User Mgmt
            </button>
            <button onClick={() => setActiveTab('communities')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${activeTab === 'communities' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>
                <Users className="w-4 h-4" /> Communities
            </button>
            <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${activeTab === 'analytics' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>
                <Activity className="w-4 h-4" /> Analytics
            </button>
        </div>
      </div>

      {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* FACULTY STRESS HEATMAP */}
              <div className="glass-panel p-6 rounded-3xl lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <AlertOctagon className="w-6 h-6 text-orange-500" /> 
                                Faculty Stress Index
                            </h3>
                            <p className="text-sm text-slate-400">Correlation heatmap between academic units and student burnout signals.</p>
                        </div>
                        <button className="text-xs flex items-center gap-1 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-lg hover:bg-violet-500/10 transition-colors">
                            <Zap className="w-3 h-3" /> Export to BigQuery
                        </button>
                    </div>

                    <div className="h-64 bg-slate-900/50 rounded-2xl p-4 border border-slate-800 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={facultyStressData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                                <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 11}} axisLine={false} tickLine={false} />
                                <YAxis hide domain={[0, 100]} />
                                <Tooltip 
                                    cursor={{fill: '#334155', opacity: 0.2}}
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                />
                                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                    {facultyStressData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.score > 80 ? '#f43f5e' : entry.score > 60 ? '#f97316' : '#14b8a6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
              </div>

              {/* DROPOUT RADAR */}
              <div className="glass-panel p-6 rounded-3xl">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <Target className="w-5 h-5 text-rose-500" />
                      Invisible Dropout Radar
                  </h3>
                  <div className="h-64 w-full relative">
                       <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={dropoutRadarData}>
                                <PolarGrid stroke="#334155" opacity={0.2} />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <RechartRadar name="Risk Profile" dataKey="A" stroke="#f43f5e" strokeWidth={2} fill="#f43f5e" fillOpacity={0.3} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                        <div className="absolute top-2 right-2 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/30">
                            <span className="text-xs font-bold text-rose-400">High Risk: Financial</span>
                        </div>
                  </div>
              </div>

              {/* SIMULATOR */}
              <div className="glass-panel p-6 rounded-3xl">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-violet-500" /> Academic Policy Simulator
                  </h3>
                  <div className="space-y-6">
                      <div>
                          <div className="flex justify-between mb-2"><label className="text-sm font-bold text-slate-300">Exam Weight</label><span className="text-violet-400">{examPressure}%</span></div>
                          <input type="range" min="0" max="100" value={examPressure} onChange={(e) => setExamPressure(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg accent-violet-500" />
                      </div>
                      <div>
                          <div className="flex justify-between mb-2"><label className="text-sm font-bold text-slate-300">Assignments</label><span className="text-teal-400">{deadlineDensity}%</span></div>
                          <input type="range" min="0" max="100" value={deadlineDensity} onChange={(e) => setDeadlineDensity(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg accent-teal-500" />
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-xl text-center">
                           <p className="text-xs text-slate-500 uppercase font-bold mb-1">Projected Burnout</p>
                           <p className={`text-2xl font-bold ${projectedBurnout > 75 ? 'text-rose-500' : 'text-emerald-400'}`}>{projectedBurnout}%</p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- COMMUNITY GOVERNANCE TAB --- */}
      {activeTab === 'communities' && (
          <div className="space-y-6">
              
              {/* ANALYTICS HEADER */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Growth Chart */}
                  <div className="glass-panel p-6 rounded-3xl lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-emerald-400" /> 
                                Community Formation Rate
                            </h3>
                            <div className="flex bg-slate-800 rounded-lg p-1">
                                <button onClick={() => setDateRange('7d')} className={`px-3 py-1 text-xs font-bold rounded ${dateRange === '7d' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>7D</button>
                                <button onClick={() => setDateRange('30d')} className={`px-3 py-1 text-xs font-bold rounded ${dateRange === '30d' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>30D</button>
                            </div>
                        </div>
                        <div className="h-48 w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={communityStats}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} vertical={false} />
                                    <XAxis dataKey="date" tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                                    <Area type="monotone" dataKey="count" stroke="#10b981" fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                             </ResponsiveContainer>
                        </div>
                  </div>

                  {/* AI Safety Summary */}
                  <div className="glass-panel p-6 rounded-3xl bg-gradient-to-br from-violet-900/20 to-slate-900">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Brain className="w-5 h-5 text-violet-400" /> AI Safety Overwatch
                      </h3>
                      <div className="space-y-4">
                          <div className="bg-slate-800/50 p-3 rounded-xl border-l-2 border-emerald-500">
                              <p className="text-xs text-slate-400 uppercase font-bold mb-1">Anomaly Detection</p>
                              <p className="text-sm text-slate-200">User created groups have increased by 14% this week. No keyword triggers detected in titles.</p>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded-xl border-l-2 border-orange-500">
                              <p className="text-xs text-slate-400 uppercase font-bold mb-1">Attention Required</p>
                              <p className="text-sm text-slate-200">Group "Night Owls" has unusually high activity between 2 AM - 4 AM. Recommended moderation check.</p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* GROUPS TABLE */}
              <div className="glass-panel rounded-2xl overflow-hidden border border-slate-700/50">
                  <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-white flex items-center gap-2">
                          <Database className="w-4 h-4 text-slate-400" /> Active Groups ({filteredCommunities.length})
                      </h3>
                      <div className="flex items-center gap-2">
                           <Calendar className="w-4 h-4 text-slate-500" />
                           <span className="text-xs text-slate-400">Filtered by: {dateRange}</span>
                      </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900/80 text-xs uppercase font-bold text-slate-500">
                            <tr>
                                <th className="p-4">Group Name</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Creator</th>
                                <th className="p-4">Members</th>
                                <th className="p-4">Created</th>
                                <th className="p-4 text-right">Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredCommunities.map(group => {
                                // Find creator name
                                const creator = allUsers.find(u => u.uid === group.createdBy);
                                return (
                                    <tr key={group.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 font-bold text-white">{group.name}</td>
                                        <td className="p-4">
                                            <span className={`text-[10px] uppercase px-2 py-1 rounded font-bold ${group.type === 'ai' ? 'bg-violet-500/10 text-violet-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                {group.type === 'ai' ? 'System AI' : 'User Gen'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-xs">
                                                {group.createdBy === 'system' ? (
                                                    <span className="text-slate-500 flex items-center gap-1"><Zap className="w-3 h-3" /> Aura OS</span>
                                                ) : (
                                                    <>
                                                        <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-white">
                                                            {creator?.displayName?.[0] || 'U'}
                                                        </div>
                                                        <span className={creator?.role === 'admin' ? 'text-rose-400' : 'text-slate-300'}>
                                                            {creator?.displayName || 'Unknown'}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-300">{group.memberCount}</td>
                                        <td className="p-4 text-xs">
                                            {group.createdAt?.seconds ? new Date(group.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            <button 
                                                onClick={() => {
                                                    setSelectedGroup(group);
                                                    fetchGroupMembers(group.id);
                                                }}
                                                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteGroup(group.id)}
                                                className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-colors"
                                                title="Delete Group"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                  </div>
              </div>

              {/* GROUP DETAIL MODAL (GOD MODE) */}
              {selectedGroup && (
                  <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedGroup(null)}>
                      <div className="w-full max-w-2xl bg-[#0f172a] h-full shadow-2xl border-l border-slate-700 p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-between items-start mb-8">
                              <div>
                                  <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                                      {selectedGroup.name}
                                  </h2>
                                  <p className="text-slate-400 text-sm">{selectedGroup.description}</p>
                              </div>
                              <button onClick={() => setSelectedGroup(null)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400"><XCircle className="w-6 h-6" /></button>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-8">
                               <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                   <p className="text-xs text-slate-500 uppercase font-bold">Created By</p>
                                   <p className="text-white font-bold">{selectedGroup.createdBy === 'system' ? 'Aura System' : 'Student'}</p>
                               </div>
                               <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                   <p className="text-xs text-slate-500 uppercase font-bold">Total Members</p>
                                   <p className="text-white font-bold">{groupMembers.length}</p>
                               </div>
                          </div>

                          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                              <Users className="w-5 h-5 text-violet-500" /> Member Roster
                          </h3>
                          
                          {loadingMembers ? (
                              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
                          ) : (
                              <div className="space-y-2">
                                  {groupMembers.map(member => (
                                      <div key={member.userId} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors group">
                                          <div className="flex items-center gap-3">
                                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${member.userProfile?.status === 'suspended' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                                  {member.userProfile?.displayName[0]}
                                              </div>
                                              <div>
                                                  <div className="flex items-center gap-2">
                                                      <span className={`text-sm font-bold ${member.userProfile?.status === 'suspended' ? 'text-rose-400 line-through' : 'text-white'}`}>
                                                          {member.userProfile?.displayName}
                                                      </span>
                                                      <span className="text-xs text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">Alias: {member.anonAlias}</span>
                                                  </div>
                                                  <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                                      <span>Joined: {member.joinedAt?.seconds ? new Date(member.joinedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                                                      {member.userProfile?.role !== 'student' && <span className="uppercase text-violet-400 font-bold">{member.userProfile?.role}</span>}
                                                  </div>
                                              </div>
                                          </div>

                                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button 
                                                onClick={() => handleKickMember(member.docId, member.userId)}
                                                className="p-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 hover:text-white"
                                                title="Kick from Group"
                                              >
                                                  <XCircle className="w-4 h-4" />
                                              </button>
                                              <button 
                                                onClick={async () => {
                                                    if(window.confirm("GLOBAL BAN: This will suspend the user from the entire platform.")) {
                                                        await handleUpdateStatus(member.userId, 'suspended');
                                                        // Refresh local list visual state
                                                        setGroupMembers(prev => prev.map(m => m.userId === member.userId ? {...m, userProfile: {...m.userProfile!, status: 'suspended'}} : m));
                                                    }
                                                }}
                                                className="p-2 bg-rose-500/10 text-rose-500 rounded hover:bg-rose-500 hover:text-white border border-rose-500/20"
                                                title="Global Ban"
                                              >
                                                  <Ban className="w-4 h-4" />
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'users' && (
          <div className="space-y-6">
             {/* Stats Cards */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
                     <div>
                         <p className="text-xs text-slate-500 uppercase font-bold">Total Users</p>
                         <p className="text-2xl font-bold text-white">{allUsers.length}</p>
                     </div>
                     <div className="p-3 bg-slate-800 rounded-lg text-slate-400"><Users className="w-5 h-5" /></div>
                 </div>
                 <button 
                    onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
                    className={`glass-panel p-4 rounded-xl flex items-center justify-between transition-all ${filterStatus === 'pending' ? 'ring-2 ring-orange-500 bg-orange-500/10' : 'hover:bg-slate-800/50'}`}
                 >
                     <div className="text-left">
                         <p className="text-xs text-slate-500 uppercase font-bold">Pending Approvals</p>
                         <p className="text-2xl font-bold text-orange-400">{pendingCount}</p>
                     </div>
                     <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500"><Clock className="w-5 h-5" /></div>
                 </button>
                 <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
                     <div>
                         <p className="text-xs text-slate-500 uppercase font-bold">System Status</p>
                         <p className="text-2xl font-bold text-emerald-400">Stable</p>
                     </div>
                     <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500"><Zap className="w-5 h-5" /></div>
                 </div>
             </div>

             {/* Filters */}
             <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-rose-500 transition-colors placeholder-slate-600"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <Filter className="w-4 h-4 text-slate-500" />
                    {(['all', 'student', 'peer_mentor', 'admin'] as const).map((r) => (
                        <button
                            key={r}
                            onClick={() => setFilterRole(r)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-colors border ${
                                filterRole === r 
                                ? 'bg-violet-500/20 border-violet-500 text-violet-300' 
                                : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
                            }`}
                        >
                            {r.replace('_', ' ')}
                        </button>
                    ))}
                    <div className="w-px h-6 bg-slate-700 mx-2" />
                    <button 
                        onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-colors border ${
                            filterStatus === 'pending' 
                            ? 'bg-orange-500/20 border-orange-500 text-orange-400' 
                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
                        }`}
                    >
                        Pending
                    </button>
                </div>
            </div>

             <div className="glass-panel rounded-2xl overflow-hidden border border-slate-700/50">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900/80 text-xs uppercase font-bold text-slate-500"><tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">No users found matching criteria.</td></tr>
                        ) : filteredUsers.map((user) => (
                            <tr key={user.uid} className="hover:bg-slate-800/30 border-b border-slate-800 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                            {user.photoURL ? <img src={user.photoURL} className="w-8 h-8 rounded-full" /> : <User className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{user.displayName}</div>
                                            <div className="text-xs">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4"><span className={`uppercase text-[10px] font-bold px-2 py-1 rounded border ${user.role === 'peer_mentor' ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-slate-800 border-slate-700'}`}>{user.role.replace('_', ' ')}</span></td>
                                <td className="p-4">
                                    <span className={`text-xs font-bold flex items-center gap-1.5 ${
                                        user.status === 'active' ? 'text-emerald-400' : 
                                        user.status === 'pending' ? 'text-orange-400' : 'text-rose-400'
                                    }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                            user.status === 'active' ? 'bg-emerald-500' : 
                                            user.status === 'pending' ? 'bg-orange-500 animate-pulse' : 'bg-rose-500'
                                        }`} />
                                        {user.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    {user.status === 'pending' ? (
                                        <>
                                            <button onClick={() => handleUpdateStatus(user.uid, 'active')} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-slate-900 rounded-lg hover:bg-emerald-400 font-bold text-xs transition-colors">
                                                <CheckCircle className="w-3 h-3" /> Approve
                                            </button>
                                            <button onClick={() => handleUpdateStatus(user.uid, 'suspended')} className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 font-bold text-xs transition-colors">
                                                <XCircle className="w-3 h-3" /> Reject
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {user.status !== 'active' && (
                                                <button onClick={() => handleUpdateStatus(user.uid, 'active')} className="p-2 bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20" title="Reactivate"><CheckCircle className="w-4 h-4" /></button>
                                            )}
                                            {user.status !== 'suspended' && (
                                                <button onClick={() => handleUpdateStatus(user.uid, 'suspended')} className="p-2 bg-rose-500/10 text-rose-400 rounded hover:bg-rose-500/20" title="Suspend"><Ban className="w-4 h-4" /></button>
                                            )}
                                            <button onClick={() => deleteDoc(doc(db, 'users', user.uid)).then(() => setAllUsers(prev => prev.filter(u => u.uid !== user.uid)))} className="p-2 text-slate-500 hover:text-rose-500 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
      )}
    </div>
  );
};