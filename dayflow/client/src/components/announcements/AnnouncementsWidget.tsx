import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, ShieldAlert, Info, BellRing, Sparkles, Send } from 'lucide-react';
import { Card, Button, Input } from '../ui';
import { Modal } from '../ui/Modal';
import { announcementService } from '../../services/announcementService';
import { employeeService } from '../../services/employeeService';
import { useAuth } from '../../context/AuthContext';
import type { Announcement, Department } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const AnnouncementsWidget: React.FC = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    content: string;
    priority: 'URGENT' | 'NORMAL' | 'INFO';
    target_department_id: string;
  }>({
    title: '',
    content: '',
    priority: 'NORMAL',
    target_department_id: '',
  });

  const fetchAnnouncements = async () => {
    try {
      const res = await announcementService.getAnnouncements({ limit: 5 });
      setAnnouncements(res.announcements || []);
    } catch {
      // silently handle
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    if (isHR) {
      employeeService.getDepartments().then(setDepartments).catch(() => {});
    }
  }, [isHR]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Please provide a title and announcement content');
      return;
    }

    setIsSubmitting(true);
    try {
      await announcementService.createAnnouncement({
        title: form.title.trim(),
        content: form.content.trim(),
        priority: form.priority,
        target_department_id: form.target_department_id || null,
      });

      toast.success('📢 Announcement posted! Transactional email alerts dispatched with company logo.');
      setIsModalOpen(false);
      setForm({ title: '', content: '', priority: 'NORMAL', target_department_id: '' });
      fetchAnnouncements();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to post announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this announcement?')) return;
    try {
      await announcementService.deleteAnnouncement(id);
      toast.success('Announcement removed');
      fetchAnnouncements();
    } catch {
      toast.error('Failed to remove announcement');
    }
  };

  return (
    <Card className="relative overflow-hidden border border-stone-200/90 shadow-xs">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900">Company Announcements</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <BellRing className="w-2.5 h-2.5" /> LIVE BROADCASTS
              </span>
            </div>
            <p className="text-xs text-stone-500">Official workplace notices & organizational memos</p>
          </div>
        </div>

        {isHR && (
          <Button
            id="post-announcement-btn"
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsModalOpen(true)}
            className="text-xs py-1.5"
          >
            Post Announcement
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3 py-2">
          <div className="h-16 bg-stone-50 animate-pulse rounded-xl" />
          <div className="h-16 bg-stone-50 animate-pulse rounded-xl" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-6 px-4 bg-stone-50/60 rounded-xl border border-dashed border-stone-200">
          <Info className="w-6 h-6 text-stone-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-stone-700">No active announcements</p>
          <p className="text-xs text-stone-500 mt-0.5">All official company memos and urgent notices will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((item) => {
            const isUrgent = item.priority === 'URGENT';
            const isInfo = item.priority === 'INFO';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  isUrgent
                    ? 'bg-rose-50/60 border-rose-200/80 hover:border-rose-300'
                    : isInfo
                    ? 'bg-blue-50/60 border-blue-200/80 hover:border-blue-300'
                    : 'bg-stone-50/70 border-stone-200/80 hover:border-stone-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                        isUrgent
                          ? 'bg-rose-600 text-white'
                          : isInfo
                          ? 'bg-blue-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isUrgent && <ShieldAlert className="w-3 h-3" />}
                      {item.priority}
                    </span>
                    <h4 className="text-sm font-bold text-stone-900">{item.title}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-stone-400 font-medium whitespace-nowrap">
                      {format(new Date(item.created_at), 'MMM d, yyyy · hh:mm a')}
                    </span>
                    {isHR && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(item.id)}
                        className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap pl-0.5">
                  {item.content}
                </p>

                <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                  <span>
                    Posted by: <strong>{item.author_first_name ? `${item.author_first_name} ${item.author_last_name || ''}` : 'HR Administration'}</strong>
                  </span>
                  {item.department_name && (
                    <span className="text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                      Dept: {item.department_name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Announcement Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Post Company Announcement"
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" disabled={isSubmitting} onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              id="submit-announcement-btn"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleCreateAnnouncement}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Broadcast & Send Email Alerts
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-800">
            <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900">Automatic Email Broadcast Engine</p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Posting this announcement will immediately dispatch in-app notifications and professional HTML emails featuring the official <strong>Work Suite HRMS logo</strong> to all active employees.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Announcement Title *</label>
            <Input
              id="announcement-title-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Annual Townhall Meeting / Upcoming Office Holiday"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Priority Level</label>
              <select
                id="announcement-priority-select"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as 'NORMAL' | 'URGENT' | 'INFO' })}
                className="w-full text-xs py-2 px-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="NORMAL">Normal Notice</option>
                <option value="URGENT">🚨 Urgent Broadcast</option>
                <option value="INFO">ℹ️ General Info</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Target Department</label>
              <select
                id="announcement-dept-select"
                value={form.target_department_id}
                onChange={(e) => setForm({ ...form, target_department_id: e.target.value })}
                className="w-full text-xs py-2 px-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">🏢 All Company Personnel</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Message Content *</label>
            <textarea
              id="announcement-content-input"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4}
              placeholder="Write the full announcement message here..."
              className="w-full text-xs p-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </form>
      </Modal>
    </Card>
  );
};
