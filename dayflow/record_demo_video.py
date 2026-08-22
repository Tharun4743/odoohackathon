import asyncio
import os
import json
import time
import imageio_ffmpeg
import subprocess
from playwright.async_api import async_playwright

BASE_DIR = r"C:\Users\tharu\.gemini\antigravity-ide\brain\7726e031-fcef-46fd-862b-78099f3fb311\scratch"
AUDIO_DIR = os.path.join(BASE_DIR, "audio")
CLIPS_DIR = os.path.join(BASE_DIR, "clips")
FINAL_OUTPUT_DIR = r"C:\Users\tharu\.gemini\antigravity-ide\brain\7726e031-fcef-46fd-862b-78099f3fb311"
REPO_OUTPUT = r"c:\Users\tharu\Downloads\odoo hackathon\worksuite_hrms_demo_presentation.mp4"

os.makedirs(CLIPS_DIR, exist_ok=True)

# Using live deployed production URL on Render
URL = "https://worksuite-hrms.onrender.com"

async def record_all_scenes():
    print(f"--- Starting Playwright High-Definition Screen Recording on {URL} ---")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--start-maximized",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
        )
        
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1,
            record_video_dir=CLIPS_DIR,
            record_video_size={"width": 1920, "height": 1080}
        )
        
        page = await context.new_page()
        
        # --- SCENE 1: Welcome & Landing Page ---
        print("SCENE 1: Welcome & Landing Page")
        await page.goto(f"{URL}/login", wait_until="networkidle")
        await page.wait_for_timeout(4000)
        
        # --- SCENE 2: Registration & Input Validations ---
        print("SCENE 2: Registration & Form Validation")
        await page.click('a[href="/register"]')
        await page.wait_for_timeout(2000)
        
        # Fill in Registration Details
        await page.fill('#register-employee-id', "EMP-005")
        await page.wait_for_timeout(800)
        await page.fill('#register-email', "alex.morgan@worksuite.com")
        await page.wait_for_timeout(800)
        await page.fill('#register-password', "WorkSuite@2026")
        await page.wait_for_timeout(800)
        await page.fill('#register-confirm-password', "WorkSuite@2026")
        await page.wait_for_timeout(1200)
        
        # Click Continue to Email Verification
        await page.click("button[type='submit']")
        await page.wait_for_timeout(4000)
        
        # --- SCENE 3: 2-Step OTP Email Verification Screen ---
        print("SCENE 3: 2-Step Email Verification Screen & Logo")
        otp_input = page.locator('#register-otp')
        if await otp_input.count() > 0:
            await page.fill('#register-otp', "492817")
            await page.wait_for_timeout(2000)
        await page.wait_for_timeout(4000)
        
        # --- SCENE 4: HR / Admin Verification Queue ---
        print("SCENE 4: HR / Admin Verification Queue & Approvals")
        await page.context.clear_cookies()
        await page.goto(f"{URL}/login", wait_until="networkidle")
        await page.evaluate("localStorage.clear(); sessionStorage.clear();")
        await page.wait_for_timeout(1500)
        
        # Fill Admin Credentials
        await page.click("button:has-text('Tharun (Admin)')")
        await page.wait_for_timeout(1000)
        await page.click("button[type='submit']")
        await page.wait_for_timeout(3500)
        
        # Navigate to Employee Directory
        await page.goto(f"{URL}/employees", wait_until="networkidle")
        await page.wait_for_timeout(2500)
        
        # Switch to Pending Approvals Tab
        pending_tab = page.locator("button:has-text('Pending Approvals')")
        if await pending_tab.count() > 0:
            await pending_tab.click()
            await page.wait_for_timeout(3500)
            
        # --- SCENE 5: Employee Sign In ---
        print("SCENE 5: Employee Sign In")
        await page.context.clear_cookies()
        await page.goto(f"{URL}/login", wait_until="networkidle")
        await page.evaluate("localStorage.clear(); sessionStorage.clear();")
        await page.wait_for_timeout(1500)
        
        # Sign in as Employee Ramkishore
        await page.click("button:has-text('Ramkishore')")
        await page.wait_for_timeout(1000)
        await page.click("button[type='submit']")
        await page.wait_for_timeout(3500)
        
        # --- SCENE 6: Employee Dashboard ---
        print("SCENE 6: Employee Dashboard")
        await page.goto(f"{URL}/dashboard", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        await page.evaluate("window.scrollBy({ top: 350, behavior: 'smooth' })")
        await page.wait_for_timeout(2000)
        await page.evaluate("window.scrollBy({ top: -350, behavior: 'smooth' })")
        await page.wait_for_timeout(2000)
        
        # --- SCENE 7: Profile Management & Documents ---
        print("SCENE 7: Profile Management & Documents")
        await page.goto(f"{URL}/profile", wait_until="networkidle")
        await page.wait_for_timeout(2500)
        await page.evaluate("window.scrollBy({ top: 300, behavior: 'smooth' })")
        await page.wait_for_timeout(2500)
        await page.evaluate("window.scrollBy({ top: -300, behavior: 'smooth' })")
        await page.wait_for_timeout(1500)
        
        # --- SCENE 8: Biometric Attendance & Dual Terminals ---
        print("SCENE 8: Biometric Attendance & Dual Terminals")
        await page.goto(f"{URL}/attendance", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        
        # Demonstrate Biometric Check-In punch
        checkin_btn = page.locator("button:has-text('Check In')")
        if await checkin_btn.count() > 0:
            await checkin_btn.first.click()
            await page.wait_for_timeout(3000)
            
        await page.wait_for_timeout(3000)
        
        # --- SCENE 9: Time Off & Leave Management ---
        print("SCENE 9: Time Off & Leave Management")
        await page.goto(f"{URL}/leave", wait_until="networkidle")
        await page.wait_for_timeout(3500)
        
        # --- SCENE 10: Attendance-Driven Payroll & Vector PDF ---
        print("SCENE 10: Attendance-Driven Payroll & Vector PDF")
        await page.goto(f"{URL}/payroll", wait_until="networkidle")
        await page.wait_for_timeout(2500)
        
        # Expand employee accordion / click View Payslip
        payslip_btn = page.locator("button:has-text('View Payslip')")
        if await payslip_btn.count() > 0:
            await payslip_btn.first.click()
            await page.wait_for_timeout(4000)
            # Close modal
            close_btn = page.locator("button:has-text('✕')")
            if await close_btn.count() > 0:
                await close_btn.first.click()
            else:
                await page.keyboard.press("Escape")
            await page.wait_for_timeout(1500)
            
        # --- SCENE 11: HR Admin Command Center & Analytics ---
        print("SCENE 11: HR Admin Command Center & Analytics")
        await page.context.clear_cookies()
        await page.goto(f"{URL}/login", wait_until="networkidle")
        await page.evaluate("localStorage.clear(); sessionStorage.clear();")
        await page.wait_for_timeout(1500)
        await page.click("button:has-text('Sanjay (HR)')")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(3000)
        await page.goto(f"{URL}/dashboard", wait_until="networkidle")
        await page.wait_for_timeout(4000)
        
        # --- SCENE 12: Logout & Wrap-up ---
        print("SCENE 12: Logout & Wrap-up")
        await page.context.clear_cookies()
        await page.goto(f"{URL}/login", wait_until="networkidle")
        await page.evaluate("localStorage.clear(); sessionStorage.clear();")
        await page.wait_for_timeout(4000)
        
        # Finalize Video Capture
        await context.close()
        await browser.close()
        print("SUCCESS: Playwright recording successfully completed!")

if __name__ == "__main__":
    asyncio.run(record_all_scenes())
