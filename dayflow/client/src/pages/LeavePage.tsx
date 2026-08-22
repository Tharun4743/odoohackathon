/** Time Off / Leave Management Module - Person 3 */
import React, { useEffect, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, MessageSquare, Check, X as XIcon, Plane, Clock } from 'lucide-react';
import { leaveService } from '../services/leaveService';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Loader, EmptyState, Select, Input, Textarea } from '../components/ui';
import { Modal } from '../components/ui/Modal';
import type { LeaveRequest, LeaveType, LeaveStatus } from '../types';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

const timeOffStatusColor = (status: LeaveStatus) => {
  switch (status) {
    case 'APPROVED': return 'green';
    case 'REJECTED': return 'red';
    default: return 'yellow';
  }
};

export const LeavePage: React.FC = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [applyModal, setApplyModal] = useState(false);
  const [approvalModal, setApprovalModal] = useState<{ leave: LeaveRequest | null; action: 'approve' | 'reject' }>({ leave: null, action: 'approve' });
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    leave_type: 'PAID' as LeaveType,
    start_date: '',
    end_date: '',
    remarks: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [applyLoading, setApplyLoading] = useState(false);

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const res = isHR
        ? await leaveService.getAllLeaves({ status: statusFilter as LeaveStatus | undefined, page, limit: 10 })
        : await leaveService.getMyLeaves({ status: statusFilter as LeaveStatus | undefined, page, limit: 10 });
      setLeaves(res.leaves || []);
      setTotalPages(res.totalPages || 1);
    } catch { toast.error('Failed to load time off requests'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchLeaves(); }, [page, statusFilter]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.start_date) errors.start_date = 'Start date is required';
    if (!formData.end_date) errors.end_date = 'End date is required';
    if (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
      errors.end_date = 'End date must be on or after start date';
    }
    return errors;
  };

  const handleApply = async () => {
    const errs = validateForm();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setApplyLoading(true);
    try {
      await leaveService.applyLeave(formData);
      toast.success('Time off request submitted successfully!');
      setApplyModal(false);
      setFormData({ leave_type: 'PAID', start_date: '', end_date: '', remarks: '' });
      fetchLeaves();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit time off request');
    } finally { setApplyLoading(false); }
  };

  const handleAction = async () => {
    if (!approvalModal.leave) return;
    setActionLoading(true);
    try {
      if (approvalModal.action === 'approve') {
        await leaveService.approveLeave(approvalModal.leave.id, comment);
        toast.success('Time off request approved! Attendance and payroll records updated.');
      } else {
        await leaveService.rejectLeave(approvalModal.leave.id, comment);
        toast.success('Time off request rejected.');
      }
      setApprovalModal({ leave: null, action: 'approve' });
      setComment('');
      fetchLeaves();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed');
    } finally { setActionLoading(false); }
  };

  const leaveDays = (leave: LeaveRequest) =>
    differenceInDays(new Date(leave.end_date), new Date(leave.start_date)) + 1;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {isHR ? 'Time Off & Leave Management' : 'My Time Off Requests'}
          </h2>
          <p className="text-sm text-slate-500">
            {isHR
              ? 'Review and manage employee time off type requests (Paid, Sick, Unpaid)'
              : 'Submit and track your time off requests directly impacting your work schedule and payroll'
            }
          </p>
        </div>
        {!isHR && (
          <Button id="apply-time-off-btn" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setApplyModal(true)}>
            Request Time Off
          </Button>
        )}
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Select
            id="time-off-status-filter"
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setStatusFilter(e.target.value); setPage(1); }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'PENDING', label: 'Pending Approval' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
            className="w-48"
          />
        </div>

        {isLoading ? <Loader className="h-32" /> : leaves.length === 0 ? (
          <EmptyState
            icon={<Plane className="w-10 h-10" />}
            title="No time off requests found"
            description={isHR ? 'No time off requests match your filters.' : 'You haven\'t applied for time off yet.'}
            action={!isHR ? <Button onClick={() => setApplyModal(true)}>Request Time Off</Button> : undefined}
          />
        ) : (
          <div className="space-y-3">
            {leaves.map((leave: LeaveRequest) => (
              <div
                key={leave.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white gap-4"
              >
                <div className="flex-1">
                  {isHR && (
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-slate-800">{leave.first_name} {leave.last_name}</p>
                      <Badge variant="slate">{leave.employee_code}</Badge>
                      {leave.department_name && <span className="text-xs text-slate-400">· {leave.department_name}</span>}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant={leave.leave_type === 'PAID' ? 'green' : leave.leave_type === 'SICK' ? 'blue' : 'slate'}>
                      {leave.leave_type} TIME OFF
                    </Badge>
                    <span className="text-sm font-medium text-slate-700">
                      {format(new Date(leave.start_date), 'MMM d')} — {format(new Date(leave.end_date), 'MMM d, yyyy')}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      ({leaveDays(leave)} day{leaveDays(leave) > 1 ? 's' : ''})
                    </span>
                  </div>
                  {leave.remarks && (
                    <p className="text-xs text-slate-600 mt-1">Reason: "{leave.remarks}"</p>
                  )}
                  {leave.hr_comment && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-blue-500" /> HR Note: {leave.hr_comment}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Requested on {format(new Date(leave.created_at), 'MMM d, yyyy')}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Badge variant={timeOffStatusColor(leave.status) as 'green' | 'red' | 'yellow'}>
                    {leave.status}
                  </Badge>

                  {isHR && leave.status === 'PENDING' && (
                    <div className="flex gap-1.5 ml-2">
                      <Button
                        id={`approve-timeoff-${leave.id}`}
                        size="sm"
                        variant="success"
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                        onClick={() => setApprovalModal({ leave, action: 'approve' })}
                      >
                        Approve
                      </Button>
                      <Button
                        id={`reject-timeoff-${leave.id}`}
                        size="sm"
                        variant="danger"
                        leftIcon={<XIcon className="w-3.5 h-3.5" />}
                        onClick={() => setApprovalModal({ leave, action: 'reject' })}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Apply Time Off Modal */}
      <Modal
        isOpen={applyModal}
        onClose={() => setApplyModal(false)}
        title="Request Time Off"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setApplyModal(false)}>Cancel</Button>
            <Button id="submit-timeoff-btn" size="sm" isLoading={applyLoading} onClick={handleApply}>
              Submit Request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            id="time-off-type-select"
            label="Time Off Type Request"
            value={formData.leave_type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(p => ({ ...p, leave_type: e.target.value as LeaveType }))}
            options={[
              { value: 'PAID', label: 'Paid Time Off (Counts towards full pay)' },
              { value: 'SICK', label: 'Sick Time Off (Medical / Health)' },
              { value: 'UNPAID', label: 'Unpaid Time Off (Reduces payable days)' },
            ]}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="timeoff-start-date"
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, start_date: e.target.value }))}
              error={formErrors.start_date}
              min={new Date().toISOString().split('T')[0]}
              required
            />
            <Input
              id="timeoff-end-date"
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, end_date: e.target.value }))}
              error={formErrors.end_date}
              min={formData.start_date || new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          {formData.start_date && formData.end_date && (
            <p className="text-sm text-blue-600 font-medium bg-blue-50 p-2.5 rounded-lg">
              Duration: {differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1} day(s)
              {formData.leave_type === 'UNPAID' && ' · Note: Unpaid days will reduce monthly payable days in payroll.'}
            </p>
          )}
          <Textarea
            id="timeoff-remarks"
            label="Remarks / Reason"
            value={formData.remarks}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(p => ({ ...p, remarks: e.target.value }))}
            placeholder="Provide context for this time off request..."
          />
        </div>
      </Modal>

      {/* Approve/Reject Modal */}
      <Modal
        isOpen={!!approvalModal.leave}
        onClose={() => { setApprovalModal({ leave: null, action: 'approve' }); setComment(''); }}
        title={approvalModal.action === 'approve' ? 'Approve Time Off Request' : 'Reject Time Off Request'}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setApprovalModal({ leave: null, action: 'approve' })}>Cancel</Button>
            <Button
              id="confirm-timeoff-action-btn"
              variant={approvalModal.action === 'approve' ? 'success' : 'danger'}
              size="sm"
              isLoading={actionLoading}
              onClick={handleAction}
            >
              {approvalModal.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </>
        }
      >
        {approvalModal.leave && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200">
              <p className="text-sm font-bold text-slate-800">{approvalModal.leave.first_name} {approvalModal.leave.last_name}</p>
              <p className="text-sm text-slate-600">
                <span className="font-semibold">{approvalModal.leave.leave_type}</span> Time Off
              </p>
              <p className="text-sm text-slate-600">
                {format(new Date(approvalModal.leave.start_date), 'MMM d')} — {format(new Date(approvalModal.leave.end_date), 'MMM d, yyyy')}
                {' '}({leaveDays(approvalModal.leave)} days)
              </p>
              {approvalModal.leave.remarks && (
                <p className="text-xs text-slate-500 italic">"{approvalModal.leave.remarks}"</p>
              )}
            </div>
            <Textarea
              id="hr-comment"
              label="HR Review Comment"
              value={comment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
              placeholder="Add optional notes for the employee..."
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
