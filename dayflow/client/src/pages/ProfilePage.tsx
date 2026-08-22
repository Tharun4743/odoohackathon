import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Camera, Mail, Phone, MapPin, Building2, Briefcase, Calendar,
  Edit2, Save, X, Upload, ArrowLeft, FileText, ExternalLink, Trash2, CheckCircle2
} from 'lucide-react';
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
        setDocuments(docs || []);
      } else {
        const emp = await employeeService.getMyProfile();
        setEmployee(emp);
        setFormData({
          phone: emp.phone || '',
          address: emp.address || '',
        });
        const docs = await employeeService.getDocuments(emp.id);
        setDocuments(docs || []);
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
    const toastId = toast.loading('Uploading profile picture to Cloudinary...');
    try {
      const url = await employeeService.uploadProfileImage(file, routeEmployeeId ? employee.id : undefined);
      setEmployee((prev) => (prev ? { ...prev, profile_image: url } : prev));
      if (!routeEmployeeId) await refreshUser();
      toast.dismiss(toastId);
      toast.success('Profile picture saved to Cloudinary!');
    } catch {
      toast.dismiss(toastId);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDocUpload = async () => {
    if (!employee || !docForm.file || !docForm.name) {
      toast.error('Please enter a document name and select a file');
      return;
    }
    setUploadingDoc(true);
    const toastId = toast.loading('Uploading document to Cloudinary...');
    try {
      const doc = await employeeService.uploadDocument(employee.id, docForm.file, docForm.name, docForm.type);
      setDocuments((prev) => [doc, ...prev]);
      setUploadDocModal(false);
      setDocForm({ name: '', type: 'ID Proof', file: null });
      toast.dismiss(toastId);
      toast.success('Document uploaded to Cloudinary successfully!');
    } catch {
      toast.dismiss(toastId);
      toast.error('Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!employee) return;
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await employeeService.deleteDocument(employee.id, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Document removed');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Loader size="lg" /></div>;
  if (!employee) return <EmptyState title="Profile not found" description="The requested employee profile was not found." />;

  const statusColor = employee.status === 'ACTIVE' ? 'green' : employee.status === 'ON_LEAVE' ? 'yellow' : 'red';

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn font-sans pb-10">
      {routeEmployeeId && (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/employees')}
          className="-mb-2 text-stone-500 hover:text-stone-900"
        >
          Back to Employee Directory
        </Button>
      )}

      {/* Profile Header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
              {employee.profile_image ? (
                <img src={employee.profile_image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-stone-700">
                  {employee.first_name[0]}{employee.last_name?.[0] || ''}
                </span>
              )}
            </div>
            <button
              id="upload-profile-image-btn"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploadingImage}
              title="Upload new profile picture"
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center hover:bg-stone-800 transition-colors shadow-md border-2 border-white"
            >
              {uploadingImage ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h1 className="text-2xl font-black text-stone-900 tracking-tight">{employee.first_name} {employee.last_name}</h1>
              <Badge variant={statusColor as 'green' | 'yellow' | 'red'}>{employee.status}</Badge>
            </div>
            <p className="text-stone-600 text-sm font-semibold">{employee.designation || 'Staff Member'}</p>
            <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-stone-500">
              <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-stone-400" />{employee.department_name || 'General Operations'}</span>
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-stone-400" />{employee.email}</span>
              <span className="flex items-center gap-1.5 font-mono bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200"><Briefcase className="w-3 h-3 text-stone-500" />{employee.employee_code}</span>
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
        <Card className="p-6">
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">Contact & Personal Details</h2>
          {isEditing ? (
            <div className="space-y-4">
              <Input
                id="edit-phone"
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                placeholder="+91 9876543210"
              />
              <Textarea
                id="edit-address"
                label="Residential Address"
                value={formData.address}
                onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                placeholder="Enter full address"
              />
              <div className="flex gap-2.5 pt-2">
                <Button id="save-profile-btn" size="sm" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />} onClick={handleSave}>
                  Save Changes
                </Button>
                <Button size="sm" variant="outline" leftIcon={<X className="w-4 h-4" />} onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {[
                { icon: <Phone className="w-4 h-4 text-stone-400" />, label: 'Phone', value: employee.phone || 'Not provided' },
                { icon: <Mail className="w-4 h-4 text-stone-400" />, label: 'Email Address', value: employee.email },
                { icon: <MapPin className="w-4 h-4 text-stone-400" />, label: 'Residential Address', value: employee.address || 'Not provided' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3.5 p-2.5 rounded-xl bg-stone-50/70 border border-stone-200/60">
                  <span className="mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">{item.label}</p>
                    <p className="text-xs font-semibold text-stone-800 mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Job Details */}
        <Card className="p-6">
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">Job & Employment Details</h2>
          {isEditing && routeEmployeeId && isHR ? (
            <div className="space-y-4">
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
                label="Employee Status"
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
            <div className="space-y-3.5">
              {[
                { icon: <Briefcase className="w-4 h-4 text-stone-400" />, label: 'Employee ID Code', value: employee.employee_code },
                { icon: <Building2 className="w-4 h-4 text-stone-400" />, label: 'Department', value: employee.department_name || 'General' },
                { icon: <Briefcase className="w-4 h-4 text-stone-400" />, label: 'Designation', value: employee.designation || 'Software Engineer' },
                { icon: <Calendar className="w-4 h-4 text-stone-400" />, label: 'Date of Joining', value: employee.joining_date ? format(new Date(employee.joining_date), 'MMMM d, yyyy') : '—' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3.5 p-2.5 rounded-xl bg-stone-50/70 border border-stone-200/60">
                  <span className="mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">{item.label}</p>
                    <p className="text-xs font-semibold text-stone-800 mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Cloudinary Documents Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Employee Documents & Proofs</h2>
            <p className="text-xs text-stone-500 mt-0.5">Securely uploaded and stored on Cloudinary</p>
          </div>
          <Button id="upload-document-btn" size="sm" leftIcon={<Upload className="w-4 h-4" />} onClick={() => setUploadDocModal(true)}>
            Upload Document
          </Button>
        </div>

        {documents.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-10 h-10 text-stone-400" />}
            title="No documents uploaded yet"
            description="Upload verified identification proofs, educational certificates, or experience letters."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-stone-300 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-stone-200">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-900 truncate">{doc.document_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full border border-stone-200">
                        {doc.document_type}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                  <a href={doc.cloudinary_url} target="_blank" rel="noreferrer" title="Open in new tab">
                    <Button size="sm" variant="outline" leftIcon={<ExternalLink className="w-3 h-3" />}>
                      View
                    </Button>
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    title="Delete document"
                    onClick={() => handleDeleteDoc(doc.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Upload Document Modal */}
      <Modal
        isOpen={uploadDocModal}
        onClose={() => setUploadDocModal(false)}
        title="Upload Document to Cloudinary"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setUploadDocModal(false)}>Cancel</Button>
            <Button
              id="confirm-upload-doc-btn"
              size="sm"
              isLoading={uploadingDoc}
              onClick={handleDocUpload}
              disabled={!docForm.file || !docForm.name}
            >
              Upload to Cloudinary
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            id="doc-name"
            label="Document Title"
            value={docForm.name}
            onChange={(e) => setDocForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Aadhar Card / Passport / Degree Certificate"
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Document Category</label>
            <select
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-black"
              value={docForm.type}
              onChange={(e) => setDocForm(p => ({ ...p, type: e.target.value }))}
            >
              {['ID Proof', 'Address Proof', 'Educational Certificate', 'Experience Letter', 'Medical Certificate', 'Other'].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Select File (PDF / Images / Docs)</label>
            <div
              onClick={() => docInputRef.current?.click()}
              className="border-2 border-dashed border-stone-200 rounded-2xl p-6 text-center cursor-pointer hover:bg-stone-50/80 hover:border-stone-300 transition-colors"
            >
              <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-stone-800">
                {docForm.file ? docForm.file.name : 'Click to browse or drop file here'}
              </p>
              <p className="text-[10px] text-stone-400 mt-1">Supports PDF, PNG, JPG, JPEG up to 10MB</p>
            </div>
            <input
              ref={docInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => setDocForm(p => ({ ...p, file: e.target.files?.[0] || null }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
