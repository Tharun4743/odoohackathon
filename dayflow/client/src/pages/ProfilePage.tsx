import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, Mail, Phone, MapPin, Building2, Briefcase, Calendar, Edit2, Save, X, Upload, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { employeeService } from '../services/employeeService';
import { Card, Button, Input, Textarea, Badge, Loader, EmptyState, Select } from '../components/ui';
import type { Employee, Document, Department } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Modal } from '../components/ui/Modal';

export const ProfilePage: React.FC = () => {
  const { id: routeEmployeeId } = useParams<{ id: string }>();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<{
    first_name?: string;
    last_name?: string;
    phone: string;
    address: string;
    department_id?: string;
    designation?: string;
    status?: Employee['status'];
  }>({ phone: '', address: '' });

  const [uploadDocModal, setUploadDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ name: '', type: 'ID Proof', file: null as File | null });
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      if (routeEmployeeId) {
        const emp = await employeeService.getById(routeEmployeeId);
        setEmployee(emp);
        setFormData({
          first_name: emp.first_name,
          last_name: emp.last_name,
          phone: emp.phone || '',
          address: emp.address || '',
          department_id: emp.department_id || '',
          designation: emp.designation || '',
          status: emp.status,
        });
        const docs = await employeeService.getDocuments(routeEmployeeId);
        setDocuments(docs);
      } else {
        const emp = await employeeService.getMyProfile();
        setEmployee(emp);
        setFormData({
          phone: emp.phone || '',
          address: emp.address || '',
        });
        const docs = await employeeService.getDocuments(emp.id);
        setDocuments(docs);
      }
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    if (isHR) {
      employeeService.getDepartments().then(setDepartments).catch(() => {});
    }
  }, [routeEmployeeId]);

  const handleSave = async () => {
    if (!employee) return;
    setIsSaving(true);
    try {
      if (routeEmployeeId && isHR) {
        const updated = await employeeService.updateEmployee(routeEmployeeId, formData);
        setEmployee(updated);
      } else {
        const updated = await employeeService.updateMyProfile({
          phone: formData.phone,
          address: formData.address,
        });
        setEmployee(updated);
      }
      setIsEditing(false);
      toast.success('Profile updated successfully');
      fetchProfile();
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setUploadingImage(true);
    try {
      const url = await employeeService.uploadProfileImage(file, routeEmployeeId ? employee.id : undefined);
      setEmployee((prev) => (prev ? { ...prev, profile_image: url } : prev));
      if (!routeEmployeeId) await refreshUser();
      toast.success('Profile picture updated');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDocUpload = async () => {
    if (!employee || !docForm.file || !docForm.name) return;
    setUploadingDoc(true);
    try {
      const doc = await employeeService.uploadDocument(employee.id, docForm.file, docForm.name, docForm.type);
      setDocuments(prev => [doc, ...prev]);
      setUploadDocModal(false);
      setDocForm({ name: '', type: 'ID Proof', file: null });
      toast.success('Document uploaded');
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!employee) return;
    try {
      await employeeService.deleteDocument(employee.id, docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Loader size="lg" /></div>;
  if (!employee) return <EmptyState title="Profile not found" description="The requested employee profile was not found." />;

  const statusColor = employee.status === 'ACTIVE' ? 'green' : employee.status === 'ON_LEAVE' ? 'yellow' : 'red';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {routeEmployeeId && (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/employees')}
          className="-mb-2 text-slate-500 hover:text-slate-800"
        >
          Back to Employee Directory
        </Button>
      )}

      {/* Profile Header */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              {employee.profile_image ? (
                <img src={employee.profile_image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-blue-600">
                  {employee.first_name[0]}{employee.last_name?.[0] || ''}
                </span>
              )}
            </div>
            <button
              id="upload-profile-image-btn"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploadingImage}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors border-2 border-white"
            >
              {uploadingImage ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-3 h-3" />}
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-800">{employee.first_name} {employee.last_name}</h2>
              <Badge variant={statusColor as 'green' | 'yellow' | 'red'}>{employee.status}</Badge>
            </div>
            <p className="text-slate-600 text-sm font-medium">{employee.designation || 'Staff Member'}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{employee.department_name || 'No Department'}</span>
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{employee.email}</span>
              <span className="flex items-center gap-1 font-mono"><Briefcase className="w-3 h-3" />{employee.employee_code}</span>
            </div>
          </div>

          {!isEditing && (
            <Button id="edit-profile-btn" size="sm" variant="outline" leftIcon={<Edit2 className="w-4 h-4" />} onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Details */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Personal Details</h3>
          {isEditing ? (
            <div className="space-y-3">
              {routeEmployeeId && isHR && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="edit-first-name"
                    label="First Name"
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))}
                  />
                  <Input
                    id="edit-last-name"
                    label="Last Name"
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))}
                  />
                </div>
              )}
              <Input
                id="edit-phone"
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                placeholder="+91 9999999999"
                leftIcon={<Phone className="w-4 h-4" />}
              />
              <Textarea
                id="edit-address"
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                placeholder="Enter address"
              />
              <div className="flex gap-2 pt-2">
                <Button id="save-profile-btn" size="sm" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />} onClick={handleSave}>
                  Save
                </Button>
                <Button size="sm" variant="outline" leftIcon={<X className="w-4 h-4" />} onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { icon: <Phone className="w-4 h-4" />, label: 'Phone', value: employee.phone || '—' },
                { icon: <Mail className="w-4 h-4" />, label: 'Email', value: employee.email },
                { icon: <MapPin className="w-4 h-4" />, label: 'Address', value: employee.address || '—' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="text-slate-400 mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-sm text-slate-800">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Job Details */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Job Details</h3>
          {isEditing && routeEmployeeId && isHR ? (
            <div className="space-y-3">
              <Select
                id="edit-department"
                label="Department"
                value={formData.department_id || ''}
                onChange={(e) => setFormData(p => ({ ...p, department_id: e.target.value }))}
                options={departments.map(d => ({ value: d.id, label: d.name }))}
                placeholder="Select Department"
              />
              <Input
                id="edit-designation"
                label="Designation"
                value={formData.designation || ''}
                onChange={(e) => setFormData(p => ({ ...p, designation: e.target.value }))}
              />
              <Select
                id="edit-status"
                label="Status"
                value={formData.status || 'ACTIVE'}
                onChange={(e) => setFormData(p => ({ ...p, status: e.target.value as Employee['status'] }))}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                  { value: 'ON_LEAVE', label: 'On Leave' },
                  { value: 'TERMINATED', label: 'Terminated' },
                ]}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { icon: <Briefcase className="w-4 h-4" />, label: 'Employee Code', value: employee.employee_code },
                { icon: <Building2 className="w-4 h-4" />, label: 'Department', value: employee.department_name || '—' },
                { icon: <Briefcase className="w-4 h-4" />, label: 'Designation', value: employee.designation || '—' },
                { icon: <Calendar className="w-4 h-4" />, label: 'Joining Date', value: employee.joining_date ? format(new Date(employee.joining_date), 'MMMM d, yyyy') : '—' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="text-slate-400 mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-sm text-slate-800">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Employee Documents</h3>
          <Button id="upload-document-btn" size="sm" variant="outline" leftIcon={<Upload className="w-4 h-4" />} onClick={() => setUploadDocModal(true)}>
            Upload Document
          </Button>
        </div>
        {documents.length === 0 ? (
          <EmptyState title="No documents" description="No verified documents uploaded yet." />
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-700">{doc.document_name}</p>
                  <p className="text-xs text-slate-500">{doc.document_type} · {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex gap-2">
                  <a href={doc.cloudinary_url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost">View</Button>
                  </a>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteDoc(doc.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Upload Document Modal */}
      <Modal isOpen={uploadDocModal} onClose={() => setUploadDocModal(false)} title="Upload Document"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setUploadDocModal(false)}>Cancel</Button>
            <Button id="confirm-upload-doc-btn" size="sm" isLoading={uploadingDoc} onClick={handleDocUpload} disabled={!docForm.file || !docForm.name}>
              Upload
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input id="doc-name" label="Document Name" value={docForm.name} onChange={(e) => setDocForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Aadhar Card" required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Document Type</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={docForm.type} onChange={(e) => setDocForm(p => ({ ...p, type: e.target.value }))}>
              {['ID Proof', 'Address Proof', 'Educational Certificate', 'Experience Letter', 'Other'].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">File</label>
            <input ref={docInputRef} type="file" className="w-full text-sm text-slate-600" onChange={(e) => setDocForm(p => ({ ...p, file: e.target.files?.[0] || null }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
};
