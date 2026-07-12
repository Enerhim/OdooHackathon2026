"use client";

import { useState } from "react";
import { SearchFilterBar } from "@/app/components/ui/SearchFilterBar";
import { GlassCard } from "@/app/components/ui/GlassCard";
import { ChevronDown, MapPin, Package, Tag, Calendar, DollarSign, Activity, Search, Plus, Edit2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { createAsset, updateAsset, deleteAsset } from "@/lib/actions/assets.actions";

export function AssetList({ initialAssets, userRole, userDeptId, categories }: { initialAssets: any[], userRole?: string, userDeptId?: string | null, categories?: any[] }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Form / Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "", assetTag: "", categoryId: "", acquisitionDate: "", acquisitionCost: "", condition: "NEW", status: "AVAILABLE", location: "", photoUrl: ""
  });
  const [loading, setLoading] = useState(false);

  const canManageAssets = userRole === "ADMIN" || userRole === "ASSET_MANAGER";

  const filteredAssets = initialAssets.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.assetTag.toLowerCase().includes(search.toLowerCase()) ||
    (a.category?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.location || "").toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditingAsset(null);
    setFormData({
      name: "", assetTag: "", categoryId: categories?.[0]?.id || "", acquisitionDate: new Date().toISOString().split('T')[0], acquisitionCost: "", condition: "NEW", status: "AVAILABLE", location: "", photoUrl: ""
    });
    setIsModalOpen(true);
  };

  const openEditModal = (asset: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      assetTag: asset.assetTag,
      categoryId: asset.categoryId,
      acquisitionDate: asset.acquisitionDate.split('T')[0],
      acquisitionCost: asset.acquisitionCost || "",
      condition: asset.condition,
      status: asset.status,
      location: asset.location || "",
      photoUrl: asset.photoUrl || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this asset?")) return;
    setLoading(true);
    await deleteAsset(id);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (editingAsset) {
      await updateAsset(editingAsset.id, formData);
    } else {
      await createAsset(formData);
    }
    setLoading(false);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4 relative">
      <SearchFilterBar search={search} onSearchChange={setSearch} placeholder="Search assets by name, tag, category or location...">
        {canManageAssets && (
          <Button onClick={openAddModal} className="whitespace-nowrap"><Plus className="w-4 h-4 mr-2" /> Add Asset</Button>
        )}
      </SearchFilterBar>
      
      <div className="flex flex-col space-y-3">
        {filteredAssets.map(asset => {
          const isExpanded = expandedId === asset.id;
          
          return (
            <GlassCard key={asset.id} className="overflow-hidden">
              <button 
                onClick={() => setExpandedId(isExpanded ? null : asset.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 dark:hover:bg-black/5 transition-colors text-left"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{asset.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-foreground/60 mt-1">
                      <span className="flex items-center"><Tag className="w-3 h-3 mr-1" /> {asset.assetTag}</span>
                      <span>•</span>
                      <span>{asset.category?.name}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className={`hidden sm:inline-flex px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                    asset.status === 'AVAILABLE' ? 'bg-success/20 text-success' : 
                    asset.status === 'UNDER_MAINTENANCE' ? 'bg-warning/20 text-warning' : 
                    asset.status === 'ALLOCATED' ? 'bg-primary/20 text-primary' :
                    'bg-destructive/20 text-destructive'
                  }`}>
                    {asset.status.replace('_', ' ')}
                  </span>
                  <ChevronDown className={cn("w-5 h-5 text-foreground/50 transition-transform duration-300", isExpanded && "rotate-180")} />
                </div>
              </button>
              
              <div className={cn("expandable-content", isExpanded && "is-expanded")}>
                <div className="p-4 pt-0 border-t border-card-border/30 mt-2">
                  <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-4 bg-white/5 dark:bg-black/20 rounded-2xl flex-1">
                      <div className="space-y-2">
                        <div className="flex items-center text-xs font-medium text-foreground/50 uppercase tracking-wider"><Activity className="w-3 h-3 mr-1.5" /> Condition</div>
                        <p className="font-medium text-foreground">{asset.condition}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-xs font-medium text-foreground/50 uppercase tracking-wider"><Calendar className="w-3 h-3 mr-1.5" /> Acquired</div>
                        <p className="font-medium text-foreground">{new Date(asset.acquisitionDate).toLocaleDateString()}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-xs font-medium text-foreground/50 uppercase tracking-wider"><DollarSign className="w-3 h-3 mr-1.5" /> Cost</div>
                        <p className="font-medium text-foreground">{asset.acquisitionCost ? `$${asset.acquisitionCost}` : 'N/A'}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-xs font-medium text-foreground/50 uppercase tracking-wider"><MapPin className="w-3 h-3 mr-1.5" /> Location</div>
                        <p className="font-medium text-foreground">{asset.location || 'Unknown'}</p>
                      </div>
                    </div>
                    {(() => {
                      const isDeptAsset = asset.activeAllocation ? asset.activeAllocation.employee?.departmentId === userDeptId : true;
                      const showManageControls = userRole === "ADMIN" || (userRole === "ASSET_MANAGER" && isDeptAsset);
                      return showManageControls && (
                        <div className="flex flex-row md:flex-col gap-2 justify-center p-4 bg-white/5 dark:bg-black/20 rounded-2xl shrink-0">
                          <Button variant="outline" size="sm" onClick={(e) => openEditModal(asset, e)}><Edit2 className="w-4 h-4 mr-2" /> Edit</Button>
                          <Button variant="destructive" size="sm" onClick={(e) => handleDelete(asset.id, e)} disabled={loading}><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {(asset.photoUrl || asset.location) && (
                    <div className="flex flex-col md:flex-row gap-4 p-4 bg-white/5 dark:bg-black/20 rounded-2xl">
                      {asset.photoUrl && (
                        <div className="flex-1 max-w-sm">
                          <p className="text-xs font-medium text-foreground/50 uppercase tracking-wider mb-2">Photo</p>
                          <img src={asset.photoUrl} alt={asset.name} className="w-full rounded-xl border border-card-border shadow-sm" />
                        </div>
                      )}
                      {asset.location && (
                        <div className="flex-1 min-w-[250px] flex flex-col justify-center items-start">
                          <p className="text-xs font-medium text-foreground/50 uppercase tracking-wider mb-2">Map</p>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(asset.location)}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors font-medium w-full md:w-auto"
                          >
                            <MapPin className="w-5 h-5" /> Open in Google Maps
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          );
        })}
        {filteredAssets.length === 0 && (
          <GlassCard className="p-12 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
               <Search className="w-8 h-8" />
             </div>
             <h3 className="text-xl font-bold">No assets found</h3>
             <p className="text-foreground/50 mt-2">Try adjusting your search criteria</p>
          </GlassCard>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/10 text-foreground/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold mb-6">{editingAsset ? "Edit Asset" : "Register New Asset"}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Asset Name</label>
                  <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. MacBook Pro M3" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Asset Tag</label>
                  <Input required value={formData.assetTag} onChange={e => setFormData({...formData, assetTag: e.target.value})} placeholder="e.g. AST-1001" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select 
                    required
                    value={formData.categoryId} 
                    onChange={e => setFormData({...formData, categoryId: e.target.value})}
                    className="flex h-11 w-full rounded-xl border border-card-border bg-white/20 dark:bg-black/20 px-4 py-2 text-sm backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="" disabled>Select category</option>
                    {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Acquisition Date</label>
                  <Input required type="date" value={formData.acquisitionDate} onChange={e => setFormData({...formData, acquisitionDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cost ($)</label>
                  <Input type="number" step="0.01" value={formData.acquisitionCost} onChange={e => setFormData({...formData, acquisitionCost: e.target.value})} placeholder="1500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. Server Room A" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Condition</label>
                  <select 
                    value={formData.condition} 
                    onChange={e => setFormData({...formData, condition: e.target.value})}
                    className="flex h-11 w-full rounded-xl border border-card-border bg-white/20 dark:bg-black/20 px-4 py-2 text-sm backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="flex h-11 w-full rounded-xl border border-card-border bg-white/20 dark:bg-black/20 px-4 py-2 text-sm backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {["AVAILABLE", "ALLOCATED", "RESERVED", "UNDER_MAINTENANCE", "LOST", "RETIRED", "DISPOSED"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? "Saving..." : (editingAsset ? "Update Asset" : "Add Asset")}</Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
