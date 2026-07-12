"use client";

import { useState } from "react";
import { GlassCard } from "@/app/components/ui/GlassCard";
import { SearchFilterBar } from "@/app/components/ui/SearchFilterBar";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { ArrowRightLeft, Check, X, Clock, Package, MapPin, Tag, User } from "lucide-react";
import { requestTransfer, acceptTransfer, denyTransfer, allocateAsset } from "@/lib/actions/allocation.actions";

export function AllocationDashboard({ assets, users, currentUser, pendingRequests }: any) {
  const [search, setSearch] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [transferToId, setTransferToId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const isManager = currentUser?.role === "ADMIN" || currentUser?.role === "ASSET_MANAGER";

  const filteredAssets = assets.filter((a: any) => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.assetTag.toLowerCase().includes(search.toLowerCase())
  );

  const selectedAsset = assets.find((a: any) => a.id === selectedAssetId);
  const currentAllocation = selectedAsset?.allocations.find((a: any) => a.status === "ACTIVE");

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await requestTransfer(selectedAssetId!, transferToId, notes);
    setLoading(false);
    setTransferToId("");
    setNotes("");
  };

  const handleDirectAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await allocateAsset(selectedAssetId!, transferToId);
    setLoading(false);
    setTransferToId("");
  };

  const handleAcceptRequest = async (id: string) => {
    setLoading(true);
    await acceptTransfer(id);
    setLoading(false);
  };

  const handleDenyRequest = async (id: string) => {
    setLoading(true);
    await denyTransfer(id);
    setLoading(false);
  };

  const isAllocatedToMe = currentAllocation?.employeeId === currentUser?.id;
  const canManageAsset = isManager && (currentUser?.role === "ADMIN" || !currentAllocation || currentAllocation.employee?.departmentId === currentUser?.departmentId);

  return (
    <div className="space-y-6">
      {/* Pending Requests for Managers */}
      {isManager && pendingRequests.length > 0 && (
        <GlassCard className="border-warning/30 bg-warning/5">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-warning">
            <Clock className="w-5 h-5 mr-2" /> Pending Transfer Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-3">
            {pendingRequests.map((req: any) => (
              <div key={req.id} className="p-4 bg-white/40 dark:bg-black/40 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-card-border/50">
                <div>
                  <p className="font-semibold text-base">{req.asset.name} <span className="text-foreground/50 text-sm">({req.asset.assetTag})</span></p>
                  <p className="text-sm text-foreground/70 mt-1">
                    Requested by <span className="font-medium text-foreground">{req.requestedBy.name}</span> to transfer to <span className="font-medium text-foreground">{req.toEmployee.name}</span>
                  </p>
                </div>
                <div className="flex space-x-2 shrink-0">
                  <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10" onClick={() => handleAcceptRequest(req.id)} disabled={loading}>
                    <Check className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDenyRequest(req.id)} disabled={loading}>
                    <X className="w-4 h-4 mr-1" /> Deny
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Asset Search List */}
        <div className="lg:col-span-1 space-y-4">
          <SearchFilterBar search={search} onSearchChange={setSearch} placeholder="Search assets..." />
          <GlassCard className="h-[600px] overflow-y-auto p-2 space-y-2">
            {filteredAssets.map((asset: any) => (
              <button
                key={asset.id}
                onClick={() => setSelectedAssetId(asset.id)}
                className={`w-full text-left p-4 rounded-xl transition-all border ${selectedAssetId === asset.id ? 'bg-primary/10 border-primary/30 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/5 dark:hover:bg-black/5'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{asset.name}</h4>
                    <div className="flex items-center text-xs text-foreground/60 mt-1 space-x-2">
                      <span className="flex items-center"><Tag className="w-3 h-3 mr-1" /> {asset.assetTag}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${asset.status === 'AVAILABLE' ? 'bg-success/20 text-success' : 'bg-primary/10 text-primary'}`}>
                    {asset.status}
                  </span>
                </div>
              </button>
            ))}
            {filteredAssets.length === 0 && <p className="text-center text-foreground/50 py-8">No assets found</p>}
          </GlassCard>
        </div>

        {/* Right Column: Details & Forms */}
        <div className="lg:col-span-2">
          {selectedAsset ? (
            <div className="space-y-6">
              {/* Asset Header Info */}
              <GlassCard className="flex flex-col md:flex-row gap-6 items-start">
                <div className="p-4 bg-primary/10 text-primary rounded-2xl">
                  <Package className="w-12 h-12" />
                </div>
                <div className="flex-1 space-y-2">
                  <h2 className="text-2xl font-bold">{selectedAsset.name}</h2>
                  <div className="flex flex-wrap gap-4 text-sm text-foreground/70">
                    <span className="flex items-center"><Tag className="w-4 h-4 mr-1.5" /> {selectedAsset.assetTag}</span>
                    <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" /> {selectedAsset.location || 'N/A'}</span>
                    <span className="flex items-center"><User className="w-4 h-4 mr-1.5" /> Currently: {currentAllocation ? currentAllocation.employee?.name : 'Unallocated'}</span>
                  </div>
                </div>
              </GlassCard>

              {/* Forms */}
              {isAllocatedToMe && !isManager && (
                <GlassCard className="border-primary/20 bg-primary/5">
                  <h3 className="text-lg font-semibold mb-4">Request Transfer</h3>
                  <form onSubmit={handleRequestTransfer} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Transfer to Colleague</label>
                      <select required value={transferToId} onChange={e => setTransferToId(e.target.value)} className="w-full h-11 rounded-xl border border-card-border bg-white/20 dark:bg-black/20 px-4 focus:ring-2 focus:ring-primary outline-none">
                        <option value="" disabled>Select employee</option>
                        {users.filter((u: any) => u.id !== currentUser.id).map((u: any) => (
                           <option key={u.id} value={u.id}>{u.name} ({u.department?.name || 'No Dept'})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Notes (Optional)</label>
                      <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for transfer..." />
                    </div>
                    <Button type="submit" disabled={loading}><ArrowRightLeft className="w-4 h-4 mr-2" /> Submit Transfer Request</Button>
                  </form>
                </GlassCard>
              )}

              {canManageAsset && (
                <GlassCard className="border-primary/20 bg-primary/5">
                  <h3 className="text-lg font-semibold mb-4">Direct Allocation (Manager)</h3>
                  <form onSubmit={handleDirectAllocate} className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                      <div className="flex-1 w-full">
                        <label className="text-sm font-medium mb-1 block">Assign To</label>
                        <select required value={transferToId} onChange={e => setTransferToId(e.target.value)} className="w-full h-11 rounded-xl border border-card-border bg-white/20 dark:bg-black/20 px-4 focus:ring-2 focus:ring-primary outline-none">
                          <option value="" disabled>Select user</option>
                          {users.map((u: any) => (
                            <option key={u.id} value={u.id}>{u.name} ({u.department?.name || 'No Dept'})</option>
                          ))}
                        </select>
                      </div>
                      <Button type="submit" disabled={loading} className="w-full sm:w-auto">Force Allocate</Button>
                    </div>
                  </form>
                </GlassCard>
              )}

              {/* History Timeline */}
              <GlassCard>
                <h3 className="text-lg font-semibold mb-6 flex items-center"><Clock className="w-5 h-5 mr-2" /> Allocation History</h3>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-card-border before:to-transparent">
                  {selectedAsset.allocations.length === 0 ? (
                     <p className="text-foreground/50 text-center py-4 relative z-10 bg-card">No allocation history available.</p>
                  ) : (
                    selectedAsset.allocations.map((alloc: any, idx: number) => (
                      <div key={alloc.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-primary/20 text-primary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                          <ArrowRightLeft className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-white/30 dark:bg-black/30 border border-card-border shadow-sm">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-base">{alloc.employee?.name || 'Unknown'}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${alloc.status === 'ACTIVE' ? 'bg-success/20 text-success' : 'bg-foreground/10 text-foreground/50'}`}>
                              {alloc.status}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/60 mb-2">{alloc.employee?.department?.name || 'No Department'}</p>
                          <div className="text-xs text-foreground/50 space-y-1">
                            <p>Assigned: {new Date(alloc.allocatedAt).toLocaleDateString()}</p>
                            {alloc.actualReturnDate && <p>Returned: {new Date(alloc.actualReturnDate).toLocaleDateString()}</p>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-foreground/40 space-y-4">
              <Package className="w-16 h-16 opacity-20" />
              <h3 className="text-xl font-medium">Select an asset</h3>
              <p>Choose an asset from the list to view its allocation details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
