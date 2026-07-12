"use client";

import { useState } from "react";
import { Tabs } from "@/app/components/ui/Tabs";
import { SearchFilterBar } from "@/app/components/ui/SearchFilterBar";
import { GlassCard } from "@/app/components/ui/GlassCard";
import { Users, Building2, Tags, Plus, Trash2, X } from "lucide-react";
import { toggleUserStatus } from "@/lib/actions/organization.actions";
import { createCategory, deleteCategory } from "@/lib/actions/assets.actions";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";

export function OrganizationTabs({ initialDepartments, initialCategories, initialEmployees, userRole, currentUserId }: any) {
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catLoading, setCatLoading] = useState(false);

  const canManageCategories = userRole === "ADMIN" || userRole === "ASSET_MANAGER";

  const filteredDepts = initialDepartments.filter((d: any) => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.departmentHead?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredCategories = initialCategories.filter((c: any) => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredEmployees = initialEmployees.filter((e: any) => 
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase()) ||
    (e.department?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const canToggleUser = (emp: any) => {
    if (userRole === "ADMIN") return true;
    if (userRole === "DEPARTMENT_HEAD") {
       const currentUser = initialEmployees.find((e: any) => e.id === currentUserId);
       return currentUser && currentUser.department?.name === emp.department?.name;
    }
    return false;
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    setLoadingId(userId);
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await toggleUserStatus(userId, newStatus);
    setLoadingId(null);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatLoading(true);
    await createCategory({ name: catName, description: catDesc });
    setCatLoading(false);
    setIsCategoryModalOpen(false);
    setCatName("");
    setCatDesc("");
  };

  const handleDeleteCategory = async (id: string) => {
    if(!confirm("Delete this category? Associated assets might prevent this.")) return;
    setLoadingId(id);
    await deleteCategory(id);
    setLoadingId(null);
  };

  const tabs = [
    {
      id: "departments",
      label: "Departments",
      content: (
        <div className="space-y-4">
          <SearchFilterBar search={search} onSearchChange={setSearch} placeholder="Search departments..." />
          <p className="text-sm font-medium text-foreground/60 px-2">{filteredDepts.length} result{filteredDepts.length !== 1 && 's'} found</p>
          <GlassCard className="overflow-hidden">
            <div className="divide-y divide-card-border/50">
              {filteredDepts.map((d: any) => (
                <div key={d.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-white/5 dark:hover:bg-black/5 transition-colors gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary hidden sm:block">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{d.name}</h3>
                      <div className="flex items-center text-sm text-foreground/60 space-x-2 mt-0.5">
                        <span>Head: {d.departmentHead?.name || "None"}</span>
                        <span>•</span>
                        <span>Parent: {d.parentDepartment?.name || "None"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md ${d.status === 'ACTIVE' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                      {d.status}
                    </span>
                  </div>
                </div>
              ))}
              {filteredDepts.length === 0 && <div className="p-8 text-center text-foreground/50">No departments found.</div>}
            </div>
          </GlassCard>
        </div>
      )
    },
    {
      id: "categories",
      label: "Asset Categories",
      content: (
        <div className="space-y-4">
          <SearchFilterBar search={search} onSearchChange={setSearch} placeholder="Search categories...">
            {canManageCategories && (
              <Button onClick={() => setIsCategoryModalOpen(true)} className="whitespace-nowrap"><Plus className="w-4 h-4 mr-2" /> Add Category</Button>
            )}
          </SearchFilterBar>
          <p className="text-sm font-medium text-foreground/60 px-2">{filteredCategories.length} result{filteredCategories.length !== 1 && 's'} found</p>
          <GlassCard className="overflow-hidden">
            <div className="divide-y divide-card-border/50">
              {filteredCategories.map((c: any) => (
                <div key={c.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-white/5 dark:hover:bg-black/5 transition-colors gap-4">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="p-2 bg-success/10 rounded-lg text-success hidden sm:block">
                      <Tags className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{c.name}</h3>
                      <p className="text-sm text-foreground/60 line-clamp-1 mt-0.5">{c.description || "No description provided."}</p>
                    </div>
                  </div>
                  <div className="flex items-center whitespace-nowrap text-sm text-foreground/70">
                    <span className="font-medium bg-primary/10 text-primary px-2 py-1 rounded-md mr-2">{c._count?.assets || 0}</span> Assets
                    {canManageCategories && (
                       <button onClick={() => handleDeleteCategory(c.id)} disabled={loadingId === c.id} className="ml-4 p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredCategories.length === 0 && <div className="p-8 text-center text-foreground/50">No categories found.</div>}
            </div>
          </GlassCard>
          
          {isCategoryModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
              <GlassCard className="w-full max-w-md p-6 relative">
                <button onClick={() => setIsCategoryModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/10 text-foreground/70 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold mb-6">Add Category</h2>
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input required value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Server Racks" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input value={catDesc} onChange={e => setCatDesc(e.target.value)} placeholder="Short description..." />
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={catLoading}>{catLoading ? "Adding..." : "Add Category"}</Button>
                  </div>
                </form>
              </GlassCard>
            </div>
          )}
        </div>
      )
    },
    {
      id: "employees",
      label: "Employees",
      content: (
        <div className="space-y-4">
          <SearchFilterBar search={search} onSearchChange={setSearch} placeholder="Search employees by name, email or role..." />
          <p className="text-sm font-medium text-foreground/60 px-2">{filteredEmployees.length} result{filteredEmployees.length !== 1 && 's'} found</p>
          <GlassCard className="overflow-hidden">
            <div className="divide-y divide-card-border/50">
              {filteredEmployees.map((e: any) => {
                const canToggle = canToggleUser(e);
                return (
                  <div key={e.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-white/5 dark:hover:bg-black/5 transition-colors gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-warning/10 rounded-lg text-warning hidden sm:block">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">{e.name}</h3>
                        <p className="text-sm text-foreground/60 mt-0.5">{e.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                      <div className="text-sm text-foreground/70 flex items-center">
                        <span className="font-medium mr-2">{e.department?.name || "-"}</span> 
                        <span className="text-xs text-foreground/50 hidden md:inline">|</span>
                        <span className="ml-2 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-md text-xs">{e.role.replace('_', ' ')}</span>
                      </div>
                      <button 
                        disabled={!canToggle || loadingId === e.id}
                        onClick={() => handleToggleStatus(e.id, e.status)}
                        className={`self-start md:self-auto px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all ${
                          e.status === 'ACTIVE' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                        } ${canToggle ? 'hover:opacity-80 hover:scale-105 cursor-pointer shadow-sm' : 'opacity-70 cursor-not-allowed'}`}
                      >
                        {loadingId === e.id ? 'UPDATING...' : e.status}
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredEmployees.length === 0 && <div className="p-8 text-center text-foreground/50">No employees found.</div>}
            </div>
          </GlassCard>
        </div>
      )
    }
  ];

  return <Tabs tabs={tabs} defaultTab="departments" />;
}
