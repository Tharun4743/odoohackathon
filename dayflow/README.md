# Dayflow HRMS 🏢

> **"Every workday, perfectly aligned."**  
> A complete, production-quality Human Resource Management System built for the Odoo Hackathon.

---

## 🌟 Core Modules & Architecture Features

### 1. Controlled User Provisioning (Self-Registration Disabled)
- **HR/Admin Provisioning Only**: Normal employee self-registration is disabled. Employee accounts and IDs (`EMP-xxx`) are created exclusively by HR Officers or Administrators.
- **Automated Initial Password Generation**: The system creates a secure initial password upon employee registration by HR and displays a one-click credential card (`Employee Code`, `Email`, `Initial Password`, `Role`) for easy sharing.
- **Mandatory Password Change**: Employee logs in using the generated initial password and can update it anytime via the **Change Password** option in the profile avatar dropdown.

### 2. Live Employee Status Cards (HR/Admin Command Center)
- **Real-Time Work Status Matrix**: The HR/Admin Dashboard displays visual cards for all active employees with live status badges:
  - 🟢 **Green dot**: **Present** (Checked in today, with live check-in time)
  - ✈️ **Airplane badge**: **On Leave** (Covered by an approved time-off request)
  - 🟡 **Yellow dot**: **Absent without applying for time off** (Neither checked in nor on approved leave)
- **Interactive Filters & Search**: Filter instantly by *All*, *Present*, *On Leave*, or *Absent*, with real-time text search.

### 3. Detailed Attendance & Break Management
- **Ongoing Month Day-Wise View**: Employee attendance dashboard displays the current/ongoing month day-by-day by default with month-switching support.
- **Break Time Tracking**: Dedicated *Start Break* and *End Break* workflows calculate total break duration and adjust net working hours: `Net Work Hours = Total Time - Break Duration`.
- **HR Live Present View**: HR Officers can see who is checked in, on break, or completed their shift in real-time.

### 4. Attendance-Driven Payroll & Payslips
- **Direct Attendance Calculation**: System determines `Payable Days` directly from verified attendance logs and approved time-off:
  - `Payable Days = Present Days + (Half Days × 0.5) + Approved Paid Time Off`
  - `Absent Days = Total Days in Month - Payable Days - Unpaid Time Off`
  - `Pro-Rated Gross = (Base Gross / Total Days) × Payable Days`
  - `Net Salary = Pro-Rated Gross - Standard Deductions`
- **Transparent Payslip Generation**: Payslips and exported PDFs (`jsPDF` + `html2canvas`) display full attendance inputs (`Total Days`, `Present Days`, `Paid Time Off`, `Unpaid/Absent Days`, `Payable Days`).

### 5. Profile Avatar Navigation & Dropdown
- Clicking the user profile avatar in the top navigation bar opens a menu with:
  1. **My Profile** (View & edit personal info, upload avatar, manage documents)
  2. **Change Password** (Interactive modal to update password)
  3. **Log Out** (Terminates session & clears JWT token)

### 6. Time-Off Workflow & Terminology
- Standardized to **Time Off / Time Off Type Requests**:
  - `Paid Time Off` (Full pay compensation)
  - `Sick Time Off` (Medical / health)
  - `Unpaid Time Off` (Reduces payable days in payroll computation)
- HR approval/rejection modal with review notes directly syncs into attendance logs and payroll calculations.

---

## 🚀 Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS v4** + Modern Design System
- **React Router v7** with Protected & Role-based Guards
- **Axios** with global interceptors
- **Recharts** for charts & analytics
- **jsPDF** + **html2canvas** for PDF salary slip & report export
- **Lucide Icons** & **React Hot Toast**

### Backend
- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL / Supabase** with PG pool connection
- **JSON Web Tokens (JWT)** + **bcryptjs** (12 salt rounds)
- **Cloudinary SDK** + **Multer** for avatars and documents
- **Nodemailer** for notifications

---

## 🔑 Demo Accounts

The database seed provides predefined accounts for demonstration:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@dayflow.com` | `Admin@123` |
| **HR Officer** | `hr@dayflow.com` | `Hr@123` |
| **Employee** | `employee@dayflow.com` | `Employee@123` |

---

## 🛠️ Getting Started

### 1. Database Initialization
1. Execute `database/schema.sql` in your PostgreSQL / Supabase SQL Editor.
2. Run the seed script:
```bash
cd server
npm run db:seed
```

### 2. Starting the Application

#### Start Server:
```bash
cd server
npm run dev
```
*Server runs on `http://localhost:5000`*

#### Start Client:
```bash
cd client
npm run dev
```
*Client runs on `http://localhost:5173`*
