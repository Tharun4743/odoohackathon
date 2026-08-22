# Work Suite HRMS 🏢

> **"Every workday, perfectly aligned."**  
> A complete, production-quality Human Resource Management System built for the Odoo Hackathon.

---

## 🌟 Core Modules & Architecture Features

### 1. Controlled User Provisioning & 2-Step OTP Password Reset
- **HR/Admin Provisioning Only**: Normal employee self-registration is disabled (403 Forbidden). Employee accounts and IDs (`EMP-xxx`) are created exclusively by HR Officers or Administrators.
- **Automated Initial Password Generation**: The system creates a secure initial password upon employee registration by HR and displays a one-click credential card (`Employee Code`, `Email`, `Initial Password`, `Role`) for easy sharing.
- **2-Step Forgot Password Flow**: Secure 6-digit numeric OTP generation (15-minute expiry) dispatched via **Brevo HTTPS REST API (Port 443 for Render deployment)**.

### 2. Live Employee Status Cards (HR/Admin Command Center)
- **Real-Time Work Status Matrix**: The HR/Admin Dashboard displays visual cards for all active employees with live status badges:
  - 🟢 **Green dot**: **Present** (Checked in today, with live check-in time)
  - ✈️ **Airplane badge**: **On Leave** (Covered by an approved time-off request)
  - 🟡 **Yellow dot**: **Absent without applying for time off** (Neither checked in nor on approved leave)
- **Interactive Filters & Search**: Filter instantly by *All*, *Present*, *On Leave*, or *Absent*, with real-time text search.

### 3. Detailed Attendance & Break Management
- **Ongoing Month Day-Wise View**: Employee attendance dashboard displays the current/ongoing month day-by-day by default with historical month-switching support.
- **Break Time Tracking**: Dedicated *Start Break* and *End Break* workflows calculate total break duration and adjust net working hours: `Net Work Hours = Total Time - Break Duration`.
- **Shift Evaluation**: `PRESENT` ($\ge 7\text{h}$), `HALF_DAY` ($4\text{h}-7\text{h}$), `ABSENT` ($< 4\text{h}$).

### 4. Attendance-Driven Payroll & Vector PDF Payslips
- **Direct Attendance Calculation**: System determines `Payable Days` directly from verified attendance logs and approved time-off:
  $$\text{Payable Days} = \text{Present Days} + (\text{Half Days} \times 0.5) + \text{Approved Paid Time Off}$$
  $$\text{Absent Days} = \text{Total Days in Month} - \text{Payable Days} - \text{Unpaid Time Off}$$
  $$\text{Pro-Rated Gross} = \left(\frac{\text{Base Gross}}{\text{Total Days}}\right) \times \text{Payable Days}$$
  $$\text{Net Salary} = \text{Pro-Rated Gross} - \text{Standard Deductions}$$
- **Vector PDF Engine (`jsPDF`)**: Generates high-DPI official payslips with standard ASCII currency formatting (`Rs.`), complete attendance metrics, and print support.

### 5. Profile & Cloudinary Document Management
- **Avatar Upload**: Auto-cropped `300x300` square avatars stored on Cloudinary (`worksuite/profiles`).
- **Verified Document Repository**: ID proofs, address proofs, and educational certificates stored on Cloudinary (`worksuite/documents/{id}`) with direct view and delete actions.

### 6. Time-Off Workflow & Analytics
- Multi-type requests: `Paid Time Off`, `Sick Time Off`, `Unpaid Time Off`.
- Interactive Recharts analytics dashboards: Headcount, monthly payroll costs, attendance trends, and leave distribution.

---

## 🚀 Tech Stack

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** + Design System (Stone Palette)
- **Google Fonts**: Plus Jakarta Sans & Inter
- **React Router v7** with Protected & Role-based Guards
- **Recharts** for charts & analytics
- **jsPDF** for vector salary slips & reports
- **Lucide Icons** & **React Hot Toast**

### Backend
- **Node.js** + **Express 5** + **TypeScript**
- **PostgreSQL / Supabase** (Port 6543 pooler)
- **Brevo HTTPS REST API (Port 443)** for transactional emails & OTPs
- **Cloudinary SDK** for secure document and avatar storage
- **JSON Web Tokens (JWT)** + **bcryptjs** (12 salt rounds)

---

## 🔑 Team Accounts & Roles

| # | Name | Email | Role | Employee Code |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **THARUNKUMAR K** | `tharunkumark42007@gmail.com` | `ADMIN` (Lead Administrator) | `EMP-001` |
| **2** | **SANJAY S** | `sanjayselvakumar05@gmail.com` | `HR` (HR Officer & People Ops) | `EMP-002` |
| **3** | **RAMKISHORE S M** | `ramkishoresm@gmail.com` | `EMPLOYEE` (Senior Software Engineer) | `EMP-003` |
| **4** | **SANTHOSHKUMAR S** | `writetokumarsanthosh@gmail.com` | `EMPLOYEE` (Full Stack & Analytics Lead) | `EMP-004` |

---

## 🛠️ Local Development

### 1. Database Initialization
```bash
cd server
npm run migrate  # Executes database/schema.sql on Supabase
npm run seed     # Seeds the 4 team members
```

### 2. Running Locally
```bash
# Backend (Port 5000)
cd server && npm run dev

# Frontend (Port 5173)
cd client && npm run dev
```

---

## 🌐 Render Deployment Configuration

| Setting | Value |
| :--- | :--- |
| **Service Type** | Web Service |
| **Environment** | `Node` |
| **Root Directory** | `dayflow/server` |
| **Build Command** | `npm install && npm run build && cd ../client && npm install && npm run build` |
| **Start Command** | `node dist/server.js` |

### Environment Variables required on Render:
- `PORT` = `5000`
- `NODE_ENV` = `production`
- `DATABASE_URL` = `(Your Supabase Pooler Connection String)`
- `JWT_SECRET` = `(Your JWT Secret String)`
- `BREVO_API_KEY` = `(Your Brevo API Key)`
- `EMAIL_FROM` = `odoovsb@gmail.com`
- `CLOUDINARY_CLOUD_NAME` = `nr1r5044`
- `CLOUDINARY_API_KEY` = `(Your Cloudinary API Key)`
- `CLOUDINARY_API_SECRET` = `(Your Cloudinary API Secret)`
