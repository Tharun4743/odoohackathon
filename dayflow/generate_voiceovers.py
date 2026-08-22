import asyncio
import edge_tts
import json
import os
import subprocess

VOICE = "en-US-ChristopherNeural"  # Professional, confident, natural corporate narrator
RATE = "+0%"
PITCH = "+0Hz"

SECTIONS = [
    {
        "id": "scene_01_intro",
        "title": "Welcome to Work Suite HRMS",
        "subtitle": "Work Suite HRMS — Every workday, perfectly aligned.",
        "text": "Welcome to Work Suite HRMS — a comprehensive, enterprise-grade human resource management system built for precision, compliance, and seamless workforce operations."
    },
    {
        "id": "scene_02_registration",
        "title": "Part 1: Employee Registration & Validation",
        "subtitle": "A new employee registers with their ID, email, password, and role.",
        "text": "A new employee begins by registering with their Employee ID, email address, password, and Employee role. The system enforces strict field validations and password security requirements before account creation."
    },
    {
        "id": "scene_03_email_verification",
        "title": "Part 2: 2-Step Email Verification",
        "subtitle": "Verifying the corporate email via a secure 6-digit OTP.",
        "text": "After registration, the employee verifies their corporate email using a secure six-digit OTP dispatched through our transactional email gateway. Once verified, the account enters a protected Pending Approval status."
    },
    {
        "id": "scene_04_hr_approval",
        "title": "Part 3: HR / Admin Verification & Authorization",
        "subtitle": "HR reviews newly registered candidates and grants workspace access.",
        "text": "In the HR Command Center, administrators review pending employee registrations in real time. After verifying the employee's credentials, HR approves the account, immediately activating system access."
    },
    {
        "id": "scene_05_employee_login",
        "title": "Part 4: Employee Sign In",
        "subtitle": "Once approved, the employee signs in securely.",
        "text": "With HR approval granted, the employee can now sign in with their credentials to access their personalized workspace."
    },
    {
        "id": "scene_06_dashboard",
        "title": "Part 5: Employee Dashboard",
        "subtitle": "A unified command center for attendance, leaves, and activity.",
        "text": "The employee dashboard provides instant visibility into live attendance, leave balances, recent payroll summaries, company announcements, and system notifications."
    },
    {
        "id": "scene_07_profile",
        "title": "Part 6: Profile & Document Management",
        "subtitle": "Self-service profile updates and verified cloud document repository.",
        "text": "Employees can review their personal details, job designation, salary structure, and verified cloud documents. They can update permitted fields such as contact information and profile avatars with automated cloud storage."
    },
    {
        "id": "scene_08_attendance",
        "title": "Part 7: Biometric Time & Attendance",
        "subtitle": "Real-time check-in, check-out, and break duration tracker.",
        "text": "The biometric attendance module connects directly with hardware terminals. Employees record optical check-ins and check-outs with automated break deduction and daily shift evaluation."
    },
    {
        "id": "scene_09_leave",
        "title": "Part 8: Time Off & Leave Workflows",
        "subtitle": "Multi-tier leave applications and user-centric approval rosters.",
        "text": "Employees can apply for Paid, Sick, or Unpaid time off with custom remarks. HR managers review requests within a user-centric master-detail roster, approving or rejecting applications with reviewer notes."
    },
    {
        "id": "scene_10_payroll",
        "title": "Part 9: Attendance-Driven Payroll & Payslips",
        "subtitle": "Pro-rated salary calculations and high-DPI vector PDF payslips.",
        "text": "Work Suite calculates monthly payroll directly from verified biometric attendance days. Employees and HR can inspect month-by-month financial breakdowns and download official vector PDF payslips with one click."
    },
    {
        "id": "scene_11_hr_admin_portal",
        "title": "Part 10: HR / Admin Command Center & Analytics",
        "subtitle": "Live employee work matrix, terminal synchronization, and analytics.",
        "text": "The HR and Admin dashboard delivers centralized control over headcount, live employee status cards, terminal synchronization, company announcements, and organization-wide analytics."
    },
    {
        "id": "scene_12_rbac_logout",
        "title": "Part 11 & 12: Role-Based Access Control & Logout",
        "subtitle": "Strict permission boundaries and secure session termination.",
        "text": "Role-based access control enforces strict security boundaries across employees and administrators. Upon completing the workday, users sign out with full session clearance. Thank you for exploring Work Suite HRMS."
    }
]

async def generate_all():
    out_dir = r"C:\Users\tharu\.gemini\antigravity-ide\brain\7726e031-fcef-46fd-862b-78099f3fb311\scratch\audio"
    os.makedirs(out_dir, exist_ok=True)
    
    metadata = []
    
    for sec in SECTIONS:
        mp3_path = os.path.join(out_dir, f"{sec['id']}.mp3")
        srt_path = os.path.join(out_dir, f"{sec['id']}.srt")
        
        communicate = edge_tts.Communicate(sec["text"], VOICE, rate=RATE, pitch=PITCH)
        submaker = edge_tts.SubMaker()
        
        with open(mp3_path, "wb") as f:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    submaker.feed(chunk)
                    
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(submaker.get_srt())
            
        print(f"Generated audio: {sec['id']}.mp3")
        metadata.append({
            "id": sec["id"],
            "title": sec["title"],
            "subtitle": sec["subtitle"],
            "audio_file": mp3_path,
            "srt_file": srt_path,
            "text": sec["text"]
        })
        
    meta_path = os.path.join(out_dir, "sections_meta.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"All {len(SECTIONS)} voiceovers generated successfully!")

if __name__ == "__main__":
    asyncio.run(generate_all())
