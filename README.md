# Work Suite HRMS 🏢
> **"Every workday, perfectly aligned."**  
> A unified, production-grade Human Resource Management System engineered for modern workforce operations, compliance, and enterprise scalability.

[![Live Demo](https://img.shields.io/badge/🚀_Live_Production_Demo-https%3A%2F%2Fworksuite--hrms.onrender.com-000000?style=for-the-badge&logo=render&logoColor=white)](https://worksuite-hrms.onrender.com)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Tharun4743%2Fodoohackathon-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Tharun4743/odoohackathon)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js_Express_5-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_Supabase-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind_css&logoColor=white)](https://tailwindcss.com/)

---

## 🌐 Live Deployment
- **Production URL**: **[https://worksuite-hrms.onrender.com](https://worksuite-hrms.onrender.com)**
- **Cloud Infrastructure**: Render Cloud Web Service (Automated Monorepo Production Pipeline)
- **Email Gateway**: Brevo Transactional HTTPS Engine (Port 443 API) with Official Work Suite Logo
- **Media CDN**: Cloudinary Enterprise Cloud (Avatars & Verified Employee Documents)

---

## 👥 Contributor Attribution & Team Roles

| # | Team Member | Email / Contributor Identity | System Role & Access | Primary Feature Branch & Domain |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Tharun Kumar K** | `tharunkumark42007@gmail.com` | `ADMIN` (Lead Architect) | [`feature/auth-employee`](https://github.com/Tharun4743/odoohackathon/tree/feature/auth-employee) · Two-Level Auth, HR Approvals, User Lifecycle |
| **2** | **Sanjay S** | `sanjayselvakumar05@gmail.com` | `HR` (HR Operations Lead) | [`feature/payroll-analytics`](https://github.com/Tharun4743/odoohackathon/tree/feature/payroll-analytics) · Attendance Payroll Ledger & Financial Analytics |
| **3** | **Ramkishore S M** | `ramkishoresm@gmail.com` | `EMPLOYEE` (Sr. Systems Engineer) | [`feature/attendance`](https://github.com/Tharun4743/odoohackathon/tree/feature/attendance) · Biometric Hardware Network & Shift Tracking |
| **4** | **Santhoshkumar S** | `writetokumarsanthosh@gmail.com` | `EMPLOYEE` (Full Stack Lead) | [`feature/leave-timeoff`](https://github.com/Tharun4743/odoohackathon/tree/feature/leave-timeoff) · Master-Detail Time-Off Scheduling & Balances |

---

## 🌿 Git Branching Strategy & Modular Architecture

The repository is structured with modular feature branches corresponding to each core HR domain:

```
                  ┌──────────────────────────────────────────────────────────┐
                  │                      main branch                         │
                  │       (Production Monorepo on Render Web Service)        │
                  └───────────┬──────────────────────────────────┬───────────┘
                              │                                  │
          ┌───────────────────┴───────────────┐                  │
          ▼                                   ▼                  │
┌───────────────────────────────┐ ┌──────────────────────────────┴┐
│    feature/auth-employee      │ │       feature/attendance      │
│  - 2-Level Verification (OTP) │ │  - Dual Biometric Terminals   │
│  - Mandatory HR Approval Gate │ │  - Optical Fingerprint Sync   │
│  - RBAC & Credential Ledger   │ │  - Live Work Status Matrix    │
│  - Profile & Document Storage │ │  - Break Time & Shift Tracker │
└───────────────────────────────┘ └───────────────────────────────┘
          │                                   │
          ▼                                   ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│     feature/leave-timeoff     │ │   feature/payroll-analytics   │
│  - Master-Detail Leave Roster │ │  - Attendance-Driven Payroll  │
│  - Multi-tier PTO & Sick Leave│ │  - Month-by-Month Accordions  │
│  - HR Approval & Audit Trails │ │  - Vector PDF Salary Slips    │
│  - Real-time Balance Tracking │ │  - Headcount & Cost Analytics │
└───────────────────────────────┘ └───────────────────────────────┘
```

### Branch Breakdown:
1. **[`main`](https://github.com/Tharun4743/odoohackathon/tree/main)**:
   - Consolidated, fully tested production release.
   - Hosts the unified Express 5 + React 19 single-port server with static client dist delivery.
2. **[`feature/auth-employee`](https://github.com/Tharun4743/odoohackathon/tree/feature/auth-employee)**:
   - Two-Level Registration workflow (Email OTP verification + Mandatory HR/Admin Review).
   - Dynamic profile image avatar uploads with resilient Data URI fallback.
   - Secure Cloudinary document repository for ID proofs and employee credentials.
3. **[`feature/attendance`](https://github.com/Tharun4743/odoohackathon/tree/feature/attendance)**:
   - Biometric Dual-Terminal Integration: `Terminal #01 (Gate A)` & `Terminal #02 (Wing B)`.
   - Optical fingerprint animation & live hardware punch synchronization.
   - Real-time break tracker with automatic net working hours computation.
4. **[`feature/leave-timeoff`](https://github.com/Tharun4743/odoohackathon/tree/feature/leave-timeoff)**:
   - User-centric Master-Detail layout grouping leave requests under unique employee cards.
   - Pending action queue with inline `Approve` / `Reject` modals and reviewer comments.
   - Historical leave logs with status indicators (`APPROVED`, `REJECTED`, `PENDING`).
5. **[`feature/payroll-analytics`](https://github.com/Tharun4743/odoohackathon/tree/feature/payroll-analytics)**:
   - Mathematical payroll engine tied directly to verified biometric attendance days.
   - Month-wise expandable financial ledger (`2026-08`, `2026-07`, `2026-06`, `2026-05`).
   - Official vector PDF payslip generator (`jsPDF`) with full earnings, deductions, and attendance breakdown.

---

## 🔐 Two-Level Authentication & Verification Protocol

```
    NEW EMPLOYEE SIGN UP
             │
             ▼
    Enter Registration Details (EMP ID, Email, Password, Role)
             │
             ▼
    [LEVEL 1: EMAIL OTP VERIFICATION]
    System generates 6-digit cryptographic OTP sent via Brevo HTTPS API
             │
             ▼
    Employee verifies OTP ➔ Status = 'PENDING_APPROVAL', is_approved = FALSE
             │
             ▼
    Login Attempts Gated: 403 Forbidden ("Account awaiting HR approval")
             │
             ▼
    [LEVEL 2: HR / ADMIN AUTHORIZATION]
    Urgent Alert Banner on HR Dashboard ➔ Pending Approvals Queue
             │
             ├───► [REJECT] ──► Rejection email sent with remarks · Account archived
             │
             └───► [APPROVE] ──► Account Activated (`is_approved = TRUE`)
                                       │
                                       ▼
                              EMPLOYEE SIGN IN
                                       │
                                       ▼
                           EMPLOYEE DASHBOARD ACCESS
```

---

## ⏰ Biometric Hardware Time & Attendance Engine

- **Dual-Terminal Monitoring**: Connects to `ZKTeco BioAccess #01 (Gate A)` and `BioAccess #02 (Wing B)`.
- **Dynamic Punch Calculation**: Real-time aggregation across check-ins, check-outs, break starts, and break ends.
- **Shift Classification Rules**:
  $$\text{Net Work Hours} = (\text{Check-Out} - \text{Check-In}) - \text{Total Break Duration}$$
  - **PRESENT**: $\text{Net Work Hours} \ge 7\text{ Hours}$
  - **HALF-DAY**: $4\text{ Hours} \le \text{Net Work Hours} < 7\text{ Hours}$
  - **ABSENT**: $\text{Net Work Hours} < 4\text{ Hours}$ (or unrecorded punch)

---

## 💰 Attendance-Driven Payroll Engine

Work Suite computes salary based on verified biometric days and approved leaves:

$$\text{Payable Days} = \text{Present Days} + (\text{Half Days} \times 0.5) + \text{Approved Paid Leaves}$$

$$\text{Absent Days} = \text{Total Calendar Days} - \text{Payable Days} - \text{Unpaid Leaves}$$

$$\text{Pro-Rated Gross Salary} = \left(\frac{\text{Base Gross Salary}}{\text{Total Calendar Days}}\right) \times \text{Payable Days}$$

$$\text{Net Salary} = \text{Pro-Rated Gross Salary} - \text{Standard Deductions}$$

### Vector PDF Payslip Generator:
- Instant vector-rendered PDF payslips powered by `jsPDF`.
- Formatted with company header, employee designation, attendance summary, earnings table, deductions table, and net pay in Indian Rupees (`₹`).

---

## 📢 Real-Time Announcements & Email Broadcast Engine

- **Priority Tagging**: High, Normal, Urgent.
- **Multichannel Delivery**:
  1. Instant in-app notification badge increment via WebSocket / polling.
  2. Transactional HTML email delivered to all active employees featuring the official Work Suite logo via Brevo.

---

## 📡 REST API Endpoint Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Initial self-registration (Dispatches Level 1 OTP) | Public |
| `POST` | `/api/auth/verify-registration-otp` | Verifies Level 1 OTP & marks status `PENDING` | Public |
| `POST` | `/api/auth/login` | Authenticates approved users & issues JWT cookie/bearer | Public |
| `POST` | `/api/auth/forgot-password` | Dispatches password reset OTP via Brevo | Public |
| `POST` | `/api/auth/reset-password` | Validates OTP and updates account password | Public |
| `POST` | `/api/auth/logout` | Clears authentication session & cookies | Authenticated |

### Employee Lifecycle (`/api/employees`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/employees/pending-approvals` | List employees awaiting Level 2 verification | `HR`, `ADMIN` |
| `POST` | `/api/employees/:id/approve-registration` | Approve candidate & activate account | `HR`, `ADMIN` |
| `POST` | `/api/employees/:id/reject-registration` | Reject candidate with formal remarks | `HR`, `ADMIN` |
| `GET` | `/api/employees/profile/me` | Retrieve logged-in employee profile | `ALL` |
| `PUT` | `/api/employees/profile/me` | Update personal contact information | `ALL` |
| `POST` | `/api/employees/profile/me/image` | Upload profile avatar (Cloudinary / Base64) | `ALL` |
| `GET` | `/api/employees` | Search and filter organization directory | `HR`, `ADMIN` |
| `POST` | `/api/employees` | HR provisioning of new employee | `HR`, `ADMIN` |
| `GET` | `/api/employees/:id/documents` | Fetch employee verified documents | `EMPLOYEE`, `HR`, `ADMIN` |
| `POST` | `/api/employees/:id/documents` | Upload verified PDF/Image document | `EMPLOYEE`, `HR`, `ADMIN` |

### Attendance & Biometrics (`/api/attendance`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/attendance/check-in` | Record optical check-in punch | `ALL` |
| `POST` | `/api/attendance/check-out` | Record check-out punch & compute hours | `ALL` |
| `POST` | `/api/attendance/break-start` | Begin meal/rest break timer | `ALL` |
| `POST` | `/api/attendance/break-end` | End break timer & add to duration | `ALL` |
| `GET` | `/api/attendance/today` | Current day attendance status | `ALL` |
| `GET` | `/api/attendance/live-status` | Live status matrix for all employees | `HR`, `ADMIN` |
| `GET` | `/api/attendance/my` | Monthly attendance history | `ALL` |

### Time Off & Leaves (`/api/leave`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/leave/my` | Logged-in employee leave applications | `ALL` |
| `POST` | `/api/leave` | Apply for Paid, Sick, or Unpaid time off | `ALL` |
| `GET` | `/api/leave` | Organization leave requests (Master-Detail) | `HR`, `ADMIN` |
| `PUT` | `/api/leave/:id/status` | Approve or reject leave with reviewer note | `HR`, `ADMIN` |

### Payroll Ledger (`/api/payroll`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/payroll/my` | Month-wise personal payslips | `ALL` |
| `GET` | `/api/payroll` | Organization payroll master ledger | `HR`, `ADMIN` |
| `POST` | `/api/payroll/generate` | Trigger monthly attendance salary calculation | `HR`, `ADMIN` |

### Announcements & Broadcasts (`/api/announcements`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/announcements` | Retrieve company announcements feed | `ALL` |
| `POST` | `/api/announcements` | Publish notice & dispatch email broadcast | `HR`, `ADMIN` |

---

## 💻 Local Development Setup

### Prerequisites
- Node.js `v18.0.0` or higher
- PostgreSQL database instance (or Supabase Connection String)
- Brevo Account for Transactional Emails
- Cloudinary Account for Document/Media CDN

### 1. Clone Repository
```bash
git clone https://github.com/Tharun4743/odoohackathon.git
cd odoohackathon/dayflow
```

### 2. Configure Environment Variables
Create a `.env` file in `dayflow/server/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres.xxx:xxx@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
JWT_SECRET=worksuite_hrms_super_secure_jwt_secret_2026_key
BREVO_API_KEY=xkeysib-your-brevo-api-key
EMAIL_FROM=odoovsb@gmail.com
CLOUDINARY_CLOUD_NAME=nr1r5044
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### 3. Install Dependencies & Build Monorepo
```bash
# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install

# Build client and copy to server public
npm run build
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend Server (Port 5000)
cd server && npm run dev

# Terminal 2: Frontend Dev Server (Port 5173)
cd client && npm run dev
```

---

## 🚀 Render Cloud Production Deployment Guide

| Configuration Key | Recommended Setting |
| :--- | :--- |
| **Service Type** | Web Service |
| **Environment** | `Node` |
| **Root Directory** | `dayflow/server` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `node dist/server.js` |
| **Node Version** | `20.x` or higher |

---

## 📄 License & Attribution

Developed for the **Odoo Hackathon 2026** by:
- **Tharun Kumar K** (`Lead Architect & Full Stack Lead`)
- **Sanjay S** (`HR Operations & Financial Systems Lead`)
- **Ramkishore S M** (`Systems Engineer & Biometrics`)
- **Santhoshkumar S** (`Product & Workflow Lead`)

*Copyright © 2026 Work Suite HRMS. All rights reserved.*
