
import React, { useState, useEffect } from 'react';
import { GroupedCategory } from '../types';
import { getCategories, saveCategories, resetCategories } from '../services/storageService';
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  onBack: () => void;
}

export const CategorySettings: React.FC<Props> = ({ onBack }) => {
  const [categories, setCategories] = useState<GroupedCategory[]>([]);
  const [editingItem, setEditingItem] = useState<{ groupIdx: number, itemIdx: number, value: string } | null>(null);
  const [newItemValues, setNewItemValues] = useState<Record<number, string>>({});

  useEffect(() => {
    setCategories(getCategories());
  }, []);

  const saveChanges = (newCats: GroupedCategory[]) => {
    setCategories(newCats);
    saveCategories(newCats);
  };

  const handleAddItem = (groupIdx: number) => {
    const val = newItemValues[groupIdx]?.trim();
    if (!val) return;

    const newCats = [...categories];
    newCats[groupIdx].items.push(val);
    saveChanges(newCats);
    
    setNewItemValues(prev => ({ ...prev, [groupIdx]: '' }));
  };

  const handleDeleteItem = (groupIdx: number, itemIdx: number) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    const newCats = [...categories];
    newCats[groupIdx].items.splice(itemIdx, 1);
    saveChanges(newCats);
  };

  const startEditing = (groupIdx: number, itemIdx: number, currentVal: string) => {
    setEditingItem({ groupIdx, itemIdx, value: currentVal });
  };

  const saveEdit = () => {
    if (!editingItem) return;
    const newCats = [...categories];
    newCats[editingItem.groupIdx].items[editingItem.itemIdx] = editingItem.value;
    saveChanges(newCats);
    setEditingItem(null);
  };

  const handleReset = () => {
    if (window.confirm("Reset all categories to default? This cannot be undone.")) {
      setCategories(resetCategories());
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="text-xl font-bold text-slate-800">Manage Categories</h2>
        </div>
        <button onClick={handleReset} className="p-2 text-slate-400 hover:text-red-500" title="Reset to Defaults">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-6">
        {categories.map((group, groupIdx) => (
          <div key={group.group} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">{group.group}</h3>
              <span className="text-xs font-bold bg-slate-200 text-slate-500 px-2 py-1 rounded-full">{group.items.length}</span>
            </div>
            
            <div className="p-4 space-y-3">
              {/* Add New Item */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder={`New ${group.group} item...`}
                  className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  value={newItemValues[groupIdx] || ''}
                  onChange={(e) => setNewItemValues(prev => ({ ...prev, [groupIdx]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddItem(groupIdx);
                  }}
                />
                <button 
                  onClick={() => handleAddItem(groupIdx)}
                  disabled={!newItemValues[groupIdx]?.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* List Items */}
              {group.items.map((item, itemIdx) => (
                <div key={`${groupIdx}-${itemIdx}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all">
                  
                  {editingItem?.groupIdx === groupIdx && editingItem?.itemIdx === itemIdx ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={editingItem.value}
                        onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                        className="flex-1 p-1 bg-white border border-blue-300 rounded text-sm outline-none"
                      />
                      <button onClick={saveEdit} className="text-emerald-600 p-1 hover:bg-emerald-50 rounded"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditingItem(null)} className="text-slate-400 p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <span className="text-slate-700 font-medium text-sm">{item}</span>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEditing(groupIdx, itemIdx, item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(groupIdx, itemIdx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {group.items.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-2">No items in this category.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
